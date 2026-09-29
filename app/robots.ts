import type { MetadataRoute } from "next";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/billing/",
        "/account",
        "/planner",
        "/risk-calculator",
        "/backtest",
        "/journal",
        "/dashboard",
        "/beta-reward",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/change-email",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
