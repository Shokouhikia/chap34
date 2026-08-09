/** @type {import('next').NextConfig} */
const nextConfig = {
  // Netlify's Next.js runtime is incompatible with "standalone" output, so it's
  // only enabled for the portable Docker build (see chap34-frontend/Dockerfile).
  // Netlify sets NETLIFY=true automatically during its own builds.
  output: process.env.NETLIFY ? undefined : "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
};

module.exports = nextConfig;
