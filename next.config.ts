import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Lets .mdx files act as pages (the blog), alongside the usual .tsx ones.
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Vercel already redirects http:// to https:// and sends an HSTS header
  // for custom domains; this makes that explicit at the app level too, so
  // it isn't solely dependent on the hosting platform's default behavior.
  //
  // The other headers here are low-risk hardening: nothing in this app needs
  // to be framed by another site, and there's no reason a browser should
  // ever guess a response's content type. A full Content-Security-Policy is
  // deliberately not included yet: doing that safely needs nonce wiring
  // through Next's own inline hydration scripts, which is a bigger change
  // worth testing on its own rather than risking breaking every page here.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({});

export default withMDX(nextConfig);
