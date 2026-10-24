import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const isDev = process.env.NODE_ENV === "development";

const contentSecurityPolicy = [
  "default-src 'self'",
  // React needs eval in development only, for readable error stacks.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  // Lets .mdx files act as pages (the blog), alongside the usual .tsx ones.
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Vercel already redirects http:// to https:// and sends an HSTS header
  // for custom domains; this makes that explicit at the app level too, so
  // it isn't solely dependent on the hosting platform's default behavior.
  //
  // The other headers here are low-risk hardening: nothing in this app needs
  // to be framed by another site, and there's no reason a browser should
  // ever guess a response's content type.
  //
  // The Content-Security-Policy allows scripts only from this site. It keeps
  // 'unsafe-inline' because Next's own hydration scripts are inline, and a
  // nonce-based policy would force every page (landing page, blog) to render
  // on each request instead of being served from the CDN. Everything else is
  // locked down: no third-party scripts, no plugins, no framing, forms and
  // requests only to this site. If a third-party script is ever added, it has
  // to be listed here.
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
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
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
