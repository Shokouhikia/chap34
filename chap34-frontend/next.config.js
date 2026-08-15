/** @type {import('next').NextConfig} */
const nextConfig = {
  // Netlify's Next.js runtime is incompatible with "standalone" output, so
  // standalone is opt-in for the portable Docker build only (which sets
  // DOCKER_BUILD - see chap34-frontend/Dockerfile).
  //
  // This used to key off NETLIFY instead (`process.env.NETLIFY ? undefined :
  // "standalone"`), on the assumption that Netlify always sets NETLIFY=true.
  // It doesn't for local `netlify deploy --build` runs: @netlify/build
  // sanitizes the environment it hands the build command, so NETLIFY arrived
  // unset, standalone output got produced anyway, and @netlify/plugin-nextjs
  // then crashed copying .next/standalone. Opt-in is safe by default - a
  // missing DOCKER_BUILD just means "no standalone", which is what every
  // non-Docker path wants.
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
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
