import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@moonrakers/analytics-contract"],
  reactStrictMode: true,
};

export default nextConfig;
