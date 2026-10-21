import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }] },
};

export default nextConfig;
