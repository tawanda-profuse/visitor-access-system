/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Produces a self-contained `.next/standalone` build (server + only the node_modules
  // it actually needs) so the Docker image used for deployment stays small.
  output: "standalone",
};

module.exports = nextConfig;
