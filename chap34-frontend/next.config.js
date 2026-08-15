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
  // face-api.js's TF.js bundle probes for Node built-ins (fs, encoding) that
  // its browser code path never actually calls - stub them out so webpack
  // stops warning about them.
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false, encoding: false };
    return config;
  },
};

module.exports = nextConfig;
