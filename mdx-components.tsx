import type { MDXComponents } from "mdx/types";

// Global element styling for every .mdx file in the app, matching the rest
// of the site's dark/zinc/emerald palette instead of MDX's unstyled defaults.
const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="mt-10 text-3xl font-semibold tracking-tight text-zinc-50">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-8 text-2xl font-medium tracking-tight text-zinc-50">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-lg font-medium tracking-tight text-zinc-100">{children}</h3>
  ),
  p: ({ children }) => <p className="mt-4 text-base leading-relaxed text-zinc-300">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-5 text-zinc-300">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-5 text-zinc-300">{children}</ol>,
  strong: ({ children }) => <strong className="font-medium text-zinc-100">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} className="text-sky-400 underline underline-offset-2 hover:text-sky-300">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-2 border-emerald-500/40 pl-4 text-zinc-400">{children}</blockquote>
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
