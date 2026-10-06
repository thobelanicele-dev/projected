// A small, manually-maintained list of posts. With only a handful of posts
// expected, this is simpler than wiring up filesystem globbing just to
// discover slugs that are going to be typed out one by one anyway.
export type BlogPostSummary = {
  slug: string;
  title: string;
  description: string;
  date: string;
};

export const posts: BlogPostSummary[] = [
  {
    slug: "logical-trading",
    title: "Logical Trading: How to Actually Make Smarter Trades",
    description:
      "Most traders don't lose money because they're wrong. They lose money because they're inconsistent. Here's the repeatable process that fixes that.",
    date: "2026-10-06",
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
