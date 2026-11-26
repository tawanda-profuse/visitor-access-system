# Deployment Guide — DigitalOcean

A from-scratch recipe for deploying the SecureGate admin backend on DigitalOcean.
Follow it top to bottom to stand up a brand-new environment, or use individual sections
as reference once it's live.

> **Companion guide:** [DEPLOYMENT_GUIDE_AWS.md](./DEPLOYMENT_GUIDE_AWS.md) covers the
> same application on AWS. Both guides deploy the exact same Docker image
> (`admin-backend/Dockerfile`) — only the hosting platform and how you inject
> environment variables differ. This is by design: run staging on DigitalOcean and
> production on AWS (or vice versa), or migrate between them entirely, without touching
> application code.

## Architecture at a glance

- **The app is a single portable Docker image.** Same image, same `Dockerfile`, same
  `prisma migrate deploy`-on-boot behavior described in the AWS guide. Nothing here is
  DigitalOcean-specific at the application level — it's all standard Docker.
- **Always-on container, not serverless.** As with the AWS guide: this app needs to stay
  warm in memory for the gate hardware's latency requirements, which rules out any
  request-driven serverless/functions platform. Both deployment paths below (App
  Platform and a plain Droplet) keep the container running continuously.
- **The database is Neon (serverless Postgres), used as-is.** `DATABASE_URL` points at a
  [Neon](https://neon.tech) Postgres instance reachable over the public internet. You
  don't need DigitalOcean's own managed database to deploy here — the exact same
  connection string that works from AWS works from DigitalOcean, which is what makes
  splitting staging/production across two clouds painless. DigitalOcean Managed
  Databases are covered as an opt-in alternative in [Step 1](#step-1-database) if you'd
  rather keep everything on one platform.
- **Compute: two supported paths.**
  - **DigitalOcean App Platform** (recommended, closest analog to AWS's managed ECS
    setup) — point it at your GitHub repo and Dockerfile; it builds and redeploys
    automatically on every push, with load balancing, TLS, and health checks handled for
    you. This is the main path this guide documents.
  - **A plain Droplet running Docker directly** — full manual control, closer to "just a
    VM with `docker run` on it." Covered as an alternative in
    [Appendix: Plain Droplet + Docker](#appendix-plain-droplet--docker) for cases where
    App Platform's constraints don't fit (e.g. you need to run other processes alongside
    the container, or want your own reverse proxy).

---

## Prerequisites

- A DigitalOcean account with billing enabled.
- The [`doctl`](https://docs.digitalocean.com/reference/doctl/how-to/install/) CLI
  installed and authenticated (`doctl auth init`) — optional but used for a few
  commands below; everything also has a console equivalent.
- A [Neon](https://neon.tech) account and a Postgres database/branch for this
  environment (see [Step 1](#step-1-database)).
- The repo pushed to GitHub, with DigitalOcean's GitHub App installed and granted access
  to it (App Platform prompts for this the first time you connect a repo).

---

## Step 1: Database

Same as the AWS guide — Neon is platform-agnostic, so there's nothing DigitalOcean-specific
to do here.

1. In the [Neon console](https://console.neon.tech), create a new project or a new
   **branch** off an existing one (branches are ideal for a staging environment that
   mirrors production schema instantly, without duplicating data or cost).
2. Copy the **pooled** connection string (`...-pooler.<region>.aws.neon.tech/...`) — use
   pooled, not direct, since App Platform can scale your app to multiple instances.
3. Save it for [Step 2](#step-2-create-the-app).

> **Optional alternative — DigitalOcean Managed Databases.** Databases → Create →
> PostgreSQL → pick a plan/region → once provisioned, copy its connection string from
> the "Connection Details" panel and use that as `DATABASE_URL` instead. If your app and
> database are both on DigitalOcean and in the same region, add the App Platform app as
> a "Trusted Source" on the database for a private, lower-latency connection instead of
> going over the public internet. Not required — Neon works fine as-is.

---

## Step 2: Create the App

### Option A — Console (recommended for the first time)

1. Go to **Apps** → **Create App**.
2. **Source**: choose GitHub, select your repo and branch (e.g. `main`).
3. Under **Resources found**, DigitalOcean will try to auto-detect a buildpack. Since
   this is a monorepo with a Dockerfile, click **Edit** on the detected component and:
   - Set **Source Directory** to `admin-backend`.
   - Change build method from "Buildpack" to **"Dockerfile"** — it should auto-find
     `admin-backend/Dockerfile`.
   - Set **HTTP Port** to `3000` (matches the Dockerfile's `EXPOSE 3000`).
   - Set **HTTP Request Routes** to `/`.
4. Under **Resource Type**, choose **Web Service** (always-on, not "Worker" or
   "Job") — this keeps exactly one (or more, per autoscaling) container instances
   running continuously, matching the "always-on, not serverless" requirement.
5. Pick an instance size (the smallest "Basic" tier is fine for staging; size up for
   production based on load).
6. **Environment Variables**: add every variable from
   `admin-backend/.env.example` (see the
   [reference table](#environment-variables-reference) below) — click **Edit** next to the
   component, add each as a key/value pair, and mark `DATABASE_URL`, `JWT_SECRET`,
   `GATE_API_KEY`, `SMTP_PASS`, and `SEED_ADMIN_PASSWORD` as **"Encrypted"** (the
   padlock toggle) so they're not visible in plaintext in the app spec or activity log.
7. Name the app (e.g. `admin-backend` or `admin-backend-staging`),
   choose a region, and click **Create Resources**.
8. Wait for the first build+deploy to finish (a few minutes). App Platform gives you a
   `https://<app-name>-<hash>.ondigitalocean.app` URL immediately — that's your
   `BASE_URL` until you attach a custom domain.
9. Go back into **Settings → App-Level Environment Variables** and set `BASE_URL` to
   that URL (or your custom domain, see [Custom domain](#custom-domain-optional)), then
   **Save** to trigger a redeploy.

From here, **every `git push` to the tracked branch triggers an automatic rebuild and
zero-downtime redeploy** — there is no separate GitHub Actions workflow needed for
DigitalOcean deploys, unlike the AWS path. (If you want one anyway, e.g. to gate
deploys behind CI tests passing first, see
[Step 3](#step-3-optional-ci-controlled-deploys).)

### Option B — App Spec file (reproducible, good for a second environment)

Instead of clicking through the console, you can define the whole app as YAML and
create/update it in one command — useful for spinning up a near-identical staging
environment from production's config.

Create `admin-backend/.do/app.yaml`:

```yaml
name: admin-backend
region: sgp1
services:
  - name: web
    github:
      repo: <your-org>/visitor-access-system
      branch: main
      deploy_on_push: true
    source_dir: admin-backend
    dockerfile_path: admin-backend/Dockerfile
    http_port: 3000
    instance_count: 1
    instance_size_slug: basic-xxs
    health_check:
      http_path: /api/health
    envs:
      - key: DATABASE_URL
        value: "<neon-connection-string>"
        type: SECRET
      - key: JWT_SECRET
        value: "<generate-a-long-random-string>"
        type: SECRET
      - key: JWT_EXPIRES_IN
        value: "7d"
      - key: DEFAULT_PHONE_COUNTRY
        value: "ZW"
      - key: GATE_API_KEY
        value: "<generate-a-long-random-string>"
        type: SECRET
      - key: BASE_URL
        value: "https://your-domain-or-app-url"
      - key: EMAIL_FROM
        value: "SecureGate <no-reply@yourdomain.com>"
      - key: SMTP_HOST
        value: "<your-brevo-or-smtp-host>"
      - key: SMTP_PORT
        value: "587"
      - key: SMTP_USER
        value: "<smtp-user>"
      - key: SMTP_PASS
        value: "<smtp-password>"
        type: SECRET
      - key: SEED_ADMIN_EMAIL
        value: "admin@yourdomain.com"
      - key: SEED_ADMIN_PASSWORD
        value: "<generate-a-strong-password>"
        type: SECRET
      - key: SEED_RESIDENT_PASSWORD
        value: "<generate-a-strong-password>"
        type: SECRET
      - key: ANDROID_APK_URL
        value: ""
```

Then create or update the app from this spec:

```bash
doctl apps create --spec admin-backend/.do/app.yaml     # first time
doctl apps list                                                     # find the app ID
doctl apps update <app-id> --spec admin-backend/.do/app.yaml   # subsequent edits
```

For a second environment, copy the file (e.g. `app.staging.yaml`), change `name` and the
env values, and `doctl apps create --spec app.staging.yaml`.

---

## Step 3 (optional): CI-controlled deploys

App Platform auto-deploys on push by default, which is often exactly what you want. If
you'd rather have GitHub Actions gate the deploy behind tests/lint passing first, disable
`deploy_on_push` in the spec and add a step to your workflow:

```yaml
- uses: digitalocean/app_action/deploy@v2
  with:
    token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
    app_name: admin-backend
```

Generate the token under **API → Tokens** in the DigitalOcean console (scope: read/write)
and add it as a GitHub repo secret named `DIGITALOCEAN_ACCESS_TOKEN`.

---

## Step 4: Android APK download link (DO Spaces console walkthrough)

DigitalOcean Spaces is S3-API-compatible object storage — the exact same `aws s3 cp`
command from the AWS guide's CI workflow works here too, just pointed at a different
endpoint with different credentials. This section is the DO equivalent of the AWS
guide's S3 walkthrough (Step 7 there).

### 4a. Create the Space

1. Go to **Spaces Object Storage** → **Create a Space**.
2. Pick a **region** (e.g. `sgp1` — Singapore, close to `ap-southeast-1` if you're
   splitting environments across clouds in the same geography).
3. **Enable CDN**: turn this **on**. It gives you a `<space>.<region>.cdn.digitaloceanspaces.com`
   URL that's edge-cached — meaningfully faster APK downloads for residents than hitting
   the raw Spaces endpoint directly, at no extra setup cost.
4. **File Listing**: leave this **Restricted** (private). This only controls whether
   someone can list *all* objects in the Space — it does not control per-object
   downloadability, which you set individually in the next step.
5. Name it (e.g. `securegate-mobile-releases`) and click **Create a Space**.

### 4b. Generate Spaces access keys

1. Go to **API** → **Spaces Keys** tab → **Generate New Key**.
2. Name it `github-actions-apk-upload`, copy both the **Access Key** and **Secret Key**
   immediately (the secret is only shown once).

### 4c. Make the APK object public

Unlike AWS's console (which has a full bucket-policy JSON editor), DigitalOcean Spaces'
per-object visibility is set via an **ACL on the object itself**, applied at upload time
— there's no separate "bucket policy" step to configure in the console. The upload
command handles this:

```bash
aws s3 cp app-release.apk \
  s3://securegate-mobile-releases/securegate-resident-latest.apk \
  --endpoint-url https://sgp1.digitaloceanspaces.com \
  --acl public-read
```

The standard AWS CLI works against Spaces because Spaces implements the S3 API — you're
just pointing `--endpoint-url` at DigitalOcean instead of AWS, and authenticating with
the Spaces key pair instead of an IAM role.

### 4d. Add the upload step to CI

Since this uses static access keys (Spaces doesn't support GitHub's OIDC federation the
way AWS IAM does), store them as encrypted GitHub secrets rather than repo variables:

1. Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository
   secret**: add `DO_SPACES_KEY` and `DO_SPACES_SECRET` with the values from 5b.
2. Add a step to `.github/workflows/build-android-apk.yml` (alongside, or instead of,
   the AWS S3 step — nothing stops you from publishing to both simultaneously during a
   migration window):

   ```yaml
   - name: Publish APK to DigitalOcean Spaces
     env:
       AWS_ACCESS_KEY_ID: ${{ secrets.DO_SPACES_KEY }}
       AWS_SECRET_ACCESS_KEY: ${{ secrets.DO_SPACES_SECRET }}
     working-directory: resident-app/android/app/build/outputs/apk/release
     run: |
       aws s3 cp app-release.apk \
         s3://securegate-mobile-releases/securegate-resident-latest.apk \
         --endpoint-url https://sgp1.digitaloceanspaces.com \
         --acl public-read
   ```

   (The AWS CLI reads `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` from the environment
   regardless of which provider actually issued them — that's the "S3-compatible" part.)

### 4e. Point the backend at it

Set `ANDROID_APK_URL` (via App Platform's environment variables, Step 2) to the
CDN-backed URL for speed:

```text
https://securegate-mobile-releases.sgp1.cdn.digitaloceanspaces.com/securegate-resident-latest.apk
```

(Or the non-CDN form `https://securegate-mobile-releases.sgp1.digitaloceanspaces.com/...`
if you skipped enabling the CDN in 4a.)

Verify it's publicly downloadable:

```bash
curl -I "https://securegate-mobile-releases.sgp1.cdn.digitaloceanspaces.com/securegate-resident-latest.apk"
# expect: HTTP/1.1 200 OK
```

---

## Environment variables reference

Same list as the AWS guide, sourced from `admin-backend/.env.example`.
Minimum required: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `GATE_API_KEY`,
`BASE_URL`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`. Email (`SMTP_*`, `EMAIL_FROM`)
and `ANDROID_APK_URL` are optional and degrade gracefully if unset.

**Multiple environments**: give staging and production their own Neon database, their
own random `JWT_SECRET`/`GATE_API_KEY`/`SEED_ADMIN_PASSWORD`, and their own `BASE_URL` —
exactly as in the AWS guide. Never reuse a `JWT_SECRET` across environments.

---

## Custom domain (optional)

1. App Platform → your app → **Settings** → **Domains** → **Add Domain**.
2. Enter your domain, choose whether DigitalOcean manages DNS for it (if your domain's
   nameservers already point to DO) or you'll add the given CNAME record yourself at
   your existing DNS provider.
3. App Platform provisions and renews a Let's Encrypt TLS certificate for it
   automatically — no manual ACM-style certificate step like on AWS.
4. Update `BASE_URL` to the new domain and save (triggers a redeploy).

---

## Rollback

App Platform keeps a deployment history. **Apps → your app → Activity** tab → find the
last known-good deployment → **⋯ → Rollback to this deployment**. This is faster than
the AWS path since App Platform tracks full deployment snapshots for you.

## Troubleshooting

- **Build fails on the Dockerfile step**: check **Activity → (failed deployment) →
  Build Logs**. Most common cause: `source_dir`/`dockerfile_path` pointing at the repo
  root instead of `admin-backend/` (this is a monorepo).
- **App builds but crashes on start**: **Runtime Logs** tab — usually a missing/invalid
  `DATABASE_URL` causing `prisma migrate deploy` to fail on container boot, same failure
  mode as the AWS path.
- **Health check failing**: confirm the app actually responds 200 on `/api/health` and
  that `http_port` (App Spec) / **HTTP Port** (console) is set to `3000`, matching the
  Dockerfile's `ENV PORT=3000`.
- **APK upload step fails in CI**: double check the `--endpoint-url` region prefix
  matches the region you created the Space in (e.g. `sgp1` vs `nyc3`) — Spaces endpoints
  are region-specific and a mismatch here fails silently with a generic auth error, not
  a clear "wrong region" message.

---

## Appendix: Plain Droplet + Docker

For cases where App Platform's constraints don't fit — e.g. you want your own reverse
proxy, need to run sidecar processes, or just prefer full control:

1. Create a Droplet (Ubuntu 24.04, at least 1 vCPU / 2GB RAM to match the AWS guide's
   task sizing) and install Docker (`curl -fsSL https://get.docker.com | sh`).
2. From your local machine, build and push the image to any registry the Droplet can
   pull from — DigitalOcean Container Registry works the same way ECR does:

   ```bash
   doctl registry create securegate-registry
   doctl registry login
   docker build -t registry.digitalocean.com/securegate-registry/admin-backend:latest ./admin-backend
   docker push registry.digitalocean.com/securegate-registry/admin-backend:latest
   ```

3. On the Droplet, authenticate to the registry (`doctl registry login` there too, or a
   registry credential file) and run the container directly, with an `.env` file holding
   everything from the [reference table](#environment-variables-reference):

   ```bash
   docker run -d --name admin-backend \
     --restart unless-stopped \
     -p 80:3000 \
     --env-file /opt/securegate/.env \
     registry.digitalocean.com/securegate-registry/admin-backend:latest
   ```

   `--restart unless-stopped` keeps it running across reboots/crashes — the closest
   Droplet equivalent of ECS's/App Platform's managed "always-on" guarantee.
4. Put TLS in front of it — either DigitalOcean's Load Balancer product (points at the
   Droplet, terminates TLS, health-checks `/api/health`) or a self-managed reverse proxy
   like Caddy (`sudo apt install caddy`, one-line Caddyfile: `yourdomain.com {
   reverse_proxy localhost:80 }` — Caddy handles Let's Encrypt automatically).
5. For redeploys, `docker pull` the new tag and `docker stop && docker rm && docker run`
   again (or script it) — there's no automatic rolling update here, which is the main
   tradeoff against App Platform/ECS for this path.
