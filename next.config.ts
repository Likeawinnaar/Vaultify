import type { NextConfig } from "next";
const nextConfig: NextConfig = { output: "standalone", poweredByHeader: false, experimental: { middlewareClientMaxBodySize: "6gb" } };
export default nextConfig;
