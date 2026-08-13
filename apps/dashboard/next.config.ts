import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@moonrakers/analytics-contract"],
  reactStrictMode: true,
  outputFileTracingRoot: path.resolve(process.cwd(), "..", ".."),
};

export default nextConfig;
