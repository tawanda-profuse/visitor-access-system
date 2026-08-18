# Deployment Guide — AWS

A from-scratch recipe for deploying the Ultra-Guard admin backend on AWS. Follow it top
to bottom to stand up a brand-new environment (e.g. a `staging` stack alongside an
existing `production` one), or use individual sections as reference for maintaining the
one that's already live.

> **Companion guide:** [DEPLOYMENT_GUIDE_DIGITALOCEAN.md](./DEPLOYMENT_GUIDE_DIGITALOCEAN.md)
> covers the same application on DigitalOcean. Both guides deploy the exact same Docker
> image (`ultraguard-admin-backend/Dockerfile`) — only the hosting platform and how you
> inject environment variables differ. This is by design: staging can run on one cloud
> and production on the other, or you can migrate between them, without touching
> application code.

## Architecture at a glance

- **The app is a single portable Docker image.** It's a Next.js app built with `output:
  standalone`, packaged in `ultraguard-admin-backend/Dockerfile`, that runs `prisma
  migrate deploy` on container start and then serves on port 3000. It reads all
  configuration from environment variables (see [Environment variables](#environment-variables-reference) below) —
  nothing is hard-coded to AWS.
- **Always-on container, not serverless.** This app was deliberately *not* deployed to a
  serverless platform (e.g. Lambda/Vercel functions). Serverless cold starts (200ms–1s)
  are unacceptable for a physical gate waiting on an access-code check. Every option in
  this guide keeps the Node.js process warm in memory continuously.
- **No WebSockets today, keep this in mind if that changes.** The gate/intercom
  hardware protocol is currently plain HTTP REST (see `docs/HARDWARE_INTEGRATION_PROTOCOL.md`).
  Live browser updates use Server-Sent Events (`/api/events/stream`), which works fine
  behind a standard ALB. If a future hardware integration needs raw persistent sockets
  (MQTT, raw WebSockets), an ALB/Express-service setup like the one below still supports
  WebSocket upgrades on the same port — no architecture change needed — but long-lived
  socket state doesn't survive a task being cycled by auto-scaling or a deploy, so that
  would need its own design pass at the time.
- **The database is Neon (serverless Postgres), not RDS.** `DATABASE_URL` points at a
  [Neon](https://neon.tech) Postgres instance reachable over the public internet
  (`sslmode=require`). Neon isn't AWS-specific — the same connection string works
  whether the app container runs on AWS, DigitalOcean, or your laptop, which is exactly
  why staging/production can be split across clouds. RDS is a valid alternative if you'd
  rather keep everything inside one AWS account (see the callout in
  [Step 2](#step-2-database) below), but nothing in this guide requires it.
- **Compute: Amazon ECS "Express" services.** This app runs on ECS Fargate using the
  **Express Gateway** service type — a newer, simplified ECS mode that provisions and
  wires up the Application Load Balancer, target group, security groups, and
  auto-scaling policy for you from one API call, instead of you creating each piece by
  hand. All the CLI commands below use this.

---

## Prerequisites

- AWS CLI v2 installed and configured (`aws configure` or SSO), with an IAM identity
  that has ECS/ECR/IAM/S3 admin rights in the target account.
- Docker installed locally (for building/testing the image before it goes through CI).
- A [Neon](https://neon.tech) account and a Postgres database/branch for this
  environment (free tier is enough for staging).
- The repo cloned locally: `git clone https://github.com/<org>/ultraguard-visitor-access-system`.

Pick names before you start and keep them consistent — this guide uses `ultraguard-admin-backend`
throughout; for a second environment (e.g. staging) suffix everything, e.g.
`ultraguard-admin-backend-staging`.

Set these once in your shell so every command below can just be copy-pasted:

```bash
export AWS_ACCOUNT_ID="<your-account-id>"        # e.g. 077578771346
export AWS_REGION="ap-southeast-1"               # pick the region closest to your users
export APP_NAME="ultraguard-admin-backend"        # or ultraguard-admin-backend-staging, etc.
```

---

## Step 1: One-time account setup (skip anything that already exists)

These IAM roles and the ECR repository are account-wide — you only create them once per
AWS account, not once per environment.

### 1a. ECS task execution role

This lets ECS pull your image from ECR and ship container logs to CloudWatch.

```bash
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": { "Service": "ecs-tasks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

**Console equivalent:** IAM → Roles → Create role → Trusted entity type "AWS service" →
Use case "Elastic Container Service" → "Elastic Container Service Task" → attach the
`AmazonECSTaskExecutionRolePolicy` managed policy → name it `ecsTaskExecutionRole`.

### 1b. ECS infrastructure role for Express services

This lets ECS create/manage the ALB, target group, security groups, and auto-scaling
policy on your behalf whenever you create or update an Express service.

```bash
aws iam create-role \
  --role-name ecsInfrastructureRoleForExpressServices \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "AllowAccessInfrastructureForECSExpressServices",
      "Effect": "Allow",
      "Principal": { "Service": "ecs.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam attach-role-policy \
  --role-name ecsInfrastructureRoleForExpressServices \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices
```

**Console equivalent:** IAM → Roles → Create role → Trusted entity "AWS service" → search
for "Elastic Container Service" → choose the Express/infrastructure use case if offered,
otherwise create with a custom trust policy (paste the JSON above under "Edit trust
policy") → attach `AmazonECSInfrastructureRoleforExpressGatewayServices`.

### 1c. ECR repository (one per app, shared across environments)

```bash
aws ecr create-repository \
  --repository-name "$APP_NAME" \
  --region "$AWS_REGION" \
  --image-scanning-configuration scanOnPush=true
```

**Console equivalent:** ECR → Repositories → Create repository → name it
`ultraguard-admin-backend` → (recommended) enable "Scan on push" → Create.

> If you're adding a **second environment** (e.g. staging) that shares the same image
> repo, skip 1a–1c entirely and jump to Step 2 — just reuse the existing roles/repo and
> give the new ECS service and Neon database their own names.

---

## Step 2: Database

The app expects a single `DATABASE_URL` connection string. `prisma migrate deploy` runs
automatically on every container start (baked into the Dockerfile's `CMD`), so there's no
separate migration step to run by hand.

1. In the [Neon console](https://console.neon.tech), create a new project (or, if you
   already have one for production, create a new **branch** for staging — Neon branches
   are cheap, instant copy-on-write clones of the database, ideal for a staging
   environment that mirrors production schema without duplicating data).
2. Copy the pooled connection string it gives you (it looks like
   `postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require&channel_binding=require`).
   Use the **pooled** connection string, not the direct one — ECS tasks can scale out to
   multiple instances, and Neon's pooler handles that connection fan-out for you.
3. Keep this value somewhere safe (a password manager or the AWS Secrets Manager entry
   from the callout below) — you'll paste it into the task definition in Step 4.

> **Optional alternative — Amazon RDS.** If you'd rather keep the database inside AWS
> instead of using Neon, create an RDS Postgres instance in the same VPC as the ECS
> service (so they can talk over the private network) and set `DATABASE_URL` to its
> endpoint instead. This guide doesn't cover RDS setup in detail since Neon is what's
> actually used today, but the app itself doesn't care — it's a plain `DATABASE_URL`.

> **Security best practice.** The commands below inject secrets as plain container
> environment variables to match the simplest path. For anything beyond a quick
> staging environment, store `DATABASE_URL`, `JWT_SECRET`, `GATE_API_KEY`, and
> `SEED_ADMIN_PASSWORD` in **AWS Secrets Manager** instead, and reference them via the
> `secrets` field of `--primary-container` (`valueFrom: <secret-arn>`) rather than
> `environment`. This keeps sensitive values out of the task definition, IAM console
> history, and anyone with read-only ECS access.

---

## Step 3: Build and push the image

```bash
cd ultraguard-admin-backend

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build -t "$APP_NAME" .

docker tag "$APP_NAME:latest" \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ultraguard-admin-backend:manual-$(date +%s)"

docker push \
  "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ultraguard-admin-backend:manual-$(date +%s)"
```

(In day-to-day use, `.github/workflows/deploy-backend.yml` does this automatically on
every push to `main` — see [Step 6](#step-6-automate-with-github-actions).  This manual
version is for the very first deploy, or for debugging a build issue locally.)

---

## Step 4: Create the Express service

Fill in your own values for `IMAGE_URI`, `DATABASE_URL`, etc. This is the **first-time
creation** command — after this, deploys are `update-express-gateway-service` calls (see
Step 5), not repeats of `create`.

```bash
IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ultraguard-admin-backend:manual-<the-tag-you-just-pushed>"

aws ecs create-express-gateway-service \
  --region "$AWS_REGION" \
  --cluster default \
  --service-name "$APP_NAME" \
  --execution-role-arn "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsTaskExecutionRole" \
  --infrastructure-role-arn "arn:aws:iam::$AWS_ACCOUNT_ID:role/ecsInfrastructureRoleForExpressServices" \
  --health-check-path "/api/health" \
  --cpu 1024 \
  --memory 2048 \
  --scaling-target minTaskCount=1,maxTaskCount=20,autoScalingMetric=AVERAGE_CPU,autoScalingTargetValue=60 \
  --primary-container '{
    "image": "'"$IMAGE_URI"'",
    "containerPort": 3000,
    "environment": [
      { "name": "DATABASE_URL", "value": "<neon-connection-string>" },
      { "name": "JWT_SECRET", "value": "<generate-a-long-random-string>" },
      { "name": "JWT_EXPIRES_IN", "value": "7d" },
      { "name": "DEFAULT_PHONE_COUNTRY", "value": "ZW" },
      { "name": "GATE_API_KEY", "value": "<generate-a-long-random-string>" },
      { "name": "BASE_URL", "value": "<filled in after Step 4 completes, see below>" },
      { "name": "EMAIL_FROM", "value": "Ultra-Guard Security & Fire <no-reply@yourdomain.com>" },
      { "name": "SMTP_HOST", "value": "<your-brevo-or-smtp-host>" },
      { "name": "SMTP_PORT", "value": "587" },
      { "name": "SMTP_USER", "value": "<smtp-user>" },
      { "name": "SMTP_PASS", "value": "<smtp-password>" },
      { "name": "SEED_ADMIN_EMAIL", "value": "admin@yourdomain.com" },
      { "name": "SEED_ADMIN_PASSWORD", "value": "<generate-a-strong-password>" },
      { "name": "SEED_RESIDENT_PASSWORD", "value": "<generate-a-strong-password>" },
      { "name": "ANDROID_APK_URL", "value": "" }
    ]
  }'
```

This one call provisions the ALB, target group, health checks, security groups, and
auto-scaling policy, and starts your first task. It takes 1–3 minutes.

**Get the public endpoint** it assigned you:

```bash
aws ecs describe-express-gateway-service \
  --service-arn "arn:aws:ecs:$AWS_REGION:$AWS_ACCOUNT_ID:service/default/$APP_NAME" \
  --query 'service.activeConfigurations[0].ingressPaths[0].endpoint' \
  --output text
```

This prints something like `ul-6112ec579e2f412f86edfa3d8f90d458.ecs.ap-southeast-1.on.aws`.
Prefix it with `https://` and that's your `BASE_URL` — go back and update the
`BASE_URL` environment variable with an `update-express-gateway-service` call (Step 5),
or attach your own custom domain (see [Custom domain](#custom-domain-optional) below)
and use that instead.

**Console equivalent:** as of writing, creating an Express service end-to-end is most
reliably done via the CLI/API shown above — the ECS console's service-creation wizard
may not yet expose every Express-specific option (scaling target, health check path) in
one screen. If you prefer clicking through: ECS console → Clusters → `default` → Create
service → look for an "Express" / "simplified" service type toggle, and fall back to the
CLI for anything the wizard doesn't surface.

---

## Step 5: Deploying updates

Once the service exists, every future deploy is an **update**, not a re-create. This is
exactly what `deploy-backend.yml` automates:

```bash
# 1. Build & push a new image tag (see Step 3, using a real tag like the git SHA)

# 2. Pull the current primary container config so you don't clobber existing env vars
aws ecs describe-express-gateway-service \
  --service-arn "arn:aws:ecs:$AWS_REGION:$AWS_ACCOUNT_ID:service/default/$APP_NAME" \
  --query 'service.activeConfigurations[0].primaryContainer' \
  > current-container.json

# 3. Swap in the new image, keep everything else
jq --arg image "$IMAGE_URI" '{image: $image, containerPort, environment}' \
  current-container.json > new-container.json

# 4. Roll out
aws ecs update-express-gateway-service \
  --service-arn "arn:aws:ecs:$AWS_REGION:$AWS_ACCOUNT_ID:service/default/$APP_NAME" \
  --primary-container "file://new-container.json" \
  --health-check-path "/api/health"
```

ECS performs a rolling deployment with zero downtime, and (per the live service's
deployment configuration) a canary rollout with an automatic rollback alarm if the new
revision fails health checks.

**To change an environment variable** (e.g. after setting up the S3 bucket in Step 7 and
getting your `ANDROID_APK_URL`): edit `current-container.json`'s `environment` array by
hand before running the `jq`/`update` commands above, or edit directly in the ECS
console: **ECS → Clusters → default → Services → your service → Update → Environment
variables**.

---

## Step 6: Automate with GitHub Actions

`.github/workflows/deploy-backend.yml` already does Steps 3 and 5 automatically on every
push to `main` that touches `ultraguard-admin-backend/**`. It authenticates via GitHub's
OIDC provider rather than long-lived AWS keys — no secrets to rotate.

### One-time setup for a new environment/repo

1. **Register GitHub as an OIDC identity provider** (skip if it already exists in your
   account — check first with `aws iam list-open-id-connect-providers`):

   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```

2. **Create a deploy role** trusting that provider, scoped to your exact repo and branch:

   ```bash
   aws iam create-role \
     --role-name github-actions-ultraguard-backend-deploy \
     --assume-role-policy-document '{
       "Version": "2012-10-17",
       "Statement": [{
         "Effect": "Allow",
         "Principal": { "Federated": "arn:aws:iam::'"$AWS_ACCOUNT_ID"':oidc-provider/token.actions.githubusercontent.com" },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
           "StringLike": { "token.actions.githubusercontent.com:sub": "repo:<github-org>/<repo-name>:ref:refs/heads/main" }
         }
       }]
     }'
   ```

   > **The `sub` condition must be exactly** `repo:<owner>/<repo>:ref:refs/heads/<branch>`
   > — no other characters. This is the literal string GitHub embeds in the OIDC token
   > it hands AWS; anything else (extra IDs, `@` suffixes, typos) means `sts:AssumeRoleWithWebIdentity`
   > silently fails and the workflow can't authenticate at all. **Worth double-checking
   > against whatever role is live today** — `aws iam get-role --role-name
   > github-actions-ultraguard-backend-deploy --query 'Role.AssumeRolePolicyDocument'`
   > — since a malformed condition here is a common copy-paste mistake and won't show up
   > as an error until the next deploy attempt.

3. **Attach a permissions policy** scoped to just this app's ECR repo and ECS service:

   ```bash
   aws iam put-role-policy \
     --role-name github-actions-ultraguard-backend-deploy \
     --policy-name ultraguard-backend-deploy \
     --policy-document '{
       "Version": "2012-10-17",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": ["ecr:GetAuthorizationToken"],
           "Resource": "*"
         },
         {
           "Effect": "Allow",
           "Action": ["ecr:BatchCheckLayerAvailability", "ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:PutImage", "ecr:InitiateLayerUpload", "ecr:UploadLayerPart", "ecr:CompleteLayerUpload"],
           "Resource": "arn:aws:ecr:'"$AWS_REGION"':'"$AWS_ACCOUNT_ID"':repository/ultraguard-admin-backend"
         },
         {
           "Effect": "Allow",
           "Action": ["ecs:DescribeServices", "ecs:DescribeExpressGatewayService", "ecs:UpdateExpressGatewayService"],
           "Resource": "arn:aws:ecs:'"$AWS_REGION"':'"$AWS_ACCOUNT_ID"':service/default/*"
         }
       ]
     }'
   ```

4. Update `SERVICE_ARN`/`ECR_REPOSITORY`/`AWS_REGION` at the top of
   `.github/workflows/deploy-backend.yml` if you're pointing this workflow at a
   different environment (e.g. a `-staging` service).

From here, `git push` to `main` is the entire deploy process.

---

## Step 7: Android APK download link (S3 console walkthrough)

This publishes the resident app's Android build to a stable public URL, embedded in the
resident invitation email (see `ultraguard-admin-backend/src/lib/email-templates.ts`).
`.github/workflows/build-android-apk.yml` already has the upload step wired up — these
are the one-time AWS console steps to make it work.

### 7a. Create the S3 bucket

1. Open the [S3 console](https://s3.console.aws.amazon.com/s3/home) → **Create bucket**.
2. **Bucket name**: something globally unique, e.g. `ultraguard-mobile-releases`.
3. **AWS Region**: pick the same region as everything else (e.g. `ap-southeast-1`) — not
   required to match, but keeps things simple.
4. **Object Ownership**: leave as "ACLs disabled (recommended)" — we'll use a bucket
   policy instead of ACLs.
5. **Block Public Access settings for this bucket**: uncheck **"Block all public
   access"**. Tick the confirmation checkbox that appears ("I acknowledge that the
   current settings might result in this bucket and the objects within becoming
   public"). This bucket only ever holds one public APK file, so this is intentional and
   scoped — the bucket *policy* in the next step further restricts what's actually
   public to that one object key, not the whole bucket.
6. Leave everything else default → **Create bucket**.

### 7b. Add the bucket policy (makes just the APK object public)

1. Open your new bucket → **Permissions** tab → scroll to **Bucket policy** → **Edit**.
2. Paste this (already saved in the repo at
   `ultraguard-resident-app/infra/aws/apk-bucket-policy.json` — just replace
   `REPLACE_WITH_BUCKET_NAME` with the name you chose in 7a):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadLatestResidentApk",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::REPLACE_WITH_BUCKET_NAME/ultraguard-resident-latest.apk"
       }
     ]
   }
   ```
3. **Save changes.** This makes exactly one object (`ultraguard-resident-latest.apk`)
   publicly downloadable, without a listable/public bucket.

### 7c. Create the IAM role that lets CI upload to it

1. Open the [IAM console](https://console.aws.amazon.com/iam/home) → **Roles** →
   **Create role**.
2. **Trusted entity type**: "Web identity".
3. **Identity provider**: `token.actions.githubusercontent.com` (this already exists in
   the account from the backend-deploy setup — if this is a brand-new account, see Step
   6.1 above to register it first).
4. **Audience**: `sts.amazonaws.com`.
5. Click **Next**, skip attaching a policy for now (you'll add an inline one), click
   through to **Create role**, name it `github-actions-ultraguard-apk-upload`.
6. Open the new role → **Trust relationships** tab → **Edit trust policy** → replace with
   the contents of `ultraguard-resident-app/infra/aws/apk-upload-trust-policy.json`,
   swapping in your account ID and exact `owner/repo` — the `sub` condition must read
   exactly `repo:<owner>/<repo>:ref:refs/heads/main` (see the callout in Step 6.2 about
   why this string has to be exact).
7. Open the **Permissions** tab → **Add permissions** → **Create inline policy** → switch
   to the **JSON** tab → paste the contents of
   `ultraguard-resident-app/infra/aws/apk-upload-permissions-policy.json`, swapping in
   your bucket name → name the policy `apk-upload` → **Create policy**.

### 7d. Wire it into GitHub

1. In `.github/workflows/build-android-apk.yml`, update the placeholder role ARN
   (`arn:aws:iam::077578771346:role/github-actions-ultraguard-apk-upload`) to match the
   role you just created, and `AWS_REGION` if you picked a different one.
2. On GitHub: repo → **Settings** → **Secrets and variables** → **Actions** → **Variables**
   tab → **New repository variable** → name `ANDROID_APK_BUCKET`, value = your bucket
   name from 7a.
3. Push to `main` (or run the workflow manually via **Actions** → "Build Android APK" →
   **Run workflow**) and confirm the new step succeeds.

### 7e. Point the backend at it

Set `ANDROID_APK_URL` on the ECS service (via Step 5's update procedure, or the ECS
console) to:

```
https://<bucket-name>.s3.<region>.amazonaws.com/ultraguard-resident-latest.apk
```

Verify it's actually publicly downloadable before relying on it:

```bash
curl -I "https://<bucket-name>.s3.<region>.amazonaws.com/ultraguard-resident-latest.apk"
# expect: HTTP/1.1 200 OK
```

---

## Environment variables reference

All of these come from `ultraguard-admin-backend/.env.example` — that file is the
canonical, always-up-to-date list with inline documentation for each one. At minimum,
every environment needs: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GATE_API_KEY`,
`BASE_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`. Email sending (`SMTP_*`,
`EMAIL_FROM`) and `ANDROID_APK_URL` degrade gracefully if left unset (emails log to
CloudWatch instead of sending; the app-download link is simply omitted from invites).

**Multiple environments** (e.g. staging + production): give each its own Neon database,
its own random `JWT_SECRET`/`GATE_API_KEY`/`SEED_ADMIN_PASSWORD`, and its own `BASE_URL`.
Never share a `JWT_SECRET` across environments — a staging token would otherwise
authenticate against production.

---

## Custom domain (optional)

The auto-assigned `*.ecs.<region>.on.aws` endpoint works out of the box but isn't
memorable. To put a real domain in front of it:

1. In Route 53 (or your DNS provider), find the ALB that the Express service created:
   ECS console → your service → look for the associated load balancer under the target
   group, or `aws elbv2 describe-load-balancers`.
2. Create a CNAME (or an ALIAS record if using Route 53) pointing your domain at the
   ALB's DNS name.
3. Attach an ACM certificate to the ALB's HTTPS listener for TLS (Certificate Manager →
   request a public certificate for your domain → validate via DNS → attach to the
   listener in the EC2/Load Balancers console).
4. Update `BASE_URL` to your new domain and redeploy (Step 5).

---

## Rollback

The Express service's deployment configuration already has a circuit breaker with
automatic rollback on failed health checks. To roll back manually to a known-good image:

```bash
aws ecs update-express-gateway-service \
  --service-arn "arn:aws:ecs:$AWS_REGION:$AWS_ACCOUNT_ID:service/default/$APP_NAME" \
  --primary-container '{"image": "'"$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/ultraguard-admin-backend:<previous-good-tag>"'", "containerPort": 3000}' \
  --health-check-path "/api/health"
```

Find previous tags with `aws ecr describe-images --repository-name ultraguard-admin-backend --region $AWS_REGION`.

## Troubleshooting

- **Service won't start / tasks keep cycling**: `aws logs tail /aws/ecs/default/<log-group-suffix> --follow`
  to see container stdout, or ECS console → Service → Logs tab. Usually a missing/wrong
  `DATABASE_URL` (migration fails on boot) or a port mismatch.
- **Health checks failing**: confirm `/api/health` actually returns 200 — hit the
  container directly if you can, or check `containerPort` matches what the app listens
  on (3000, set via the Dockerfile's `ENV PORT=3000`).
- **GitHub Actions can't assume the role**: almost always the OIDC `sub` condition typo
  described in Step 6.2 — copy the exact string GitHub Actions logs show it's presenting
  (visible in the failed step's error) and compare byte-for-byte against the role's trust
  policy.
