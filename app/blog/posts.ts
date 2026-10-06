// A small, manually-maintained list of posts. With only a handful of posts
// expected, this is simpler than wiring up filesystem globbing just to
// discover slugs that are going to be typed out one by one anyway.
export type BlogPostSummary = {
  slug: string;
  title: string;
  description: string;
  date: string;
  headerVariant?: "chart" | "guide";
};

// Newest first, so the most recent post leads the index and older ones
// sink toward the bottom as new ones are added above them.
export const posts: BlogPostSummary[] = [
  {
    slug: "logical-trading",
    title: "Logical Trading: How to Actually Make Smarter Trades",
    description:
      "Most traders don't lose money because they're wrong. They lose money because they're inconsistent. Here's the repeatable process that fixes that.",
    date: "2026-10-06",
  },
  {
    slug: "how-to-use-fxinsites",
    title: "How to Use FxInsites: A Simple Guide",
    description: "FxInsites does one job: it helps you plan a trade before you take it. Here's how to use it in 5 minutes.",
    date: "2026-09-29",
    headerVariant: "guide",
  },
];

export function formatPostDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
