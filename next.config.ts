import type { NextConfig } from "next";

const frameAncestors = process.env.ALLOWED_FRAME_ANCESTORS?.trim();

const nextConfig: NextConfig = {
  // Allow document uploads (PDF, images) through server actions.
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
  async headers() {
    if (!frameAncestors) return []; // démo : pas de restriction
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${frameAncestors};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
