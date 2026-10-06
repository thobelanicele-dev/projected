import type { Metadata } from "next";
import Link from "next/link";
import { posts, formatPostDate } from "@/app/blog/posts";

export const metadata: Metadata = {
  title: "Blog | FxInsites",
  description: "Notes on trading logically: planning, risk, testing ideas, and keeping an honest record.",
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-black text-zinc-50 [font-family:'Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2 text-base font-medium tracking-tight text-zinc-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]" />
            FxInsites
          </Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-14">
        <h1 className="text-3xl font-medium tracking-tight text-zinc-50">Blog</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Notes on trading logically: planning, risk, testing ideas, and keeping an honest record.
        </p>

        <ul className="mt-10 flex flex-col gap-6">
          {posts.map((post) => (
            <li key={post.slug} className="border-b border-zinc-900 pb-6">
              <Link href={`/blog/${post.slug}`} className="group">
                <h2 className="text-xl font-medium text-zinc-100 group-hover:text-emerald-400">
                  {post.title}
                </h2>
                <p className="mt-1 text-xs text-zinc-500">{formatPostDate(post.date)}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{post.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
