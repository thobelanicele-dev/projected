import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel already redirects http:// to https:// and sends an HSTS header
  // for custom domains — this makes that explicit at the app level too, so
  // it isn't solely dependent on the hosting platform's default behavior.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
