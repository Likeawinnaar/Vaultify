import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: { middlewareClientMaxBodySize: "6gb", webpackBuildWorker: false, workerThreads: true, cpus: 1 },
};
export default nextConfig;
