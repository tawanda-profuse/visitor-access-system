/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Produces a self-contained `.next/standalone` build (server + only the node_modules
  // it actually needs) so the Docker image used for deployment stays small.
  output: "standalone",
  images: {
    // next/image's optimizer needs `sharp` installed when self-hosting in standalone mode;
    // our images are small static brand assets (logo, favicon) with no real need for
    // on-the-fly resizing, so skip the optimizer entirely rather than add that dependency.
    unoptimized: true,
  },
};

module.exports = nextConfig;
