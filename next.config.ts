import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker builds set STANDALONE=1 for a slim image; other hosts use `next start`.
  output: process.env.STANDALONE === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: { remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
