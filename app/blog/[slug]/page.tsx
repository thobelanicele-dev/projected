import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogHeaderImage } from "@/app/components/BlogHeaderImage";
import { posts, formatPostDate } from "@/app/blog/posts";

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

// Any slug not in posts.ts 404s instead of attempting an import that doesn't exist.
export const dynamicParams = false;

function findPost(slug: string) {
  return posts.find((post) => post.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) return {};
  return { title: `${post.title} | FxInsites`, description: post.description };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = findPost(slug);
  if (!post) notFound();

  const { default: Post } = await import(`@/content/blog/${slug}.mdx`);

  return (
    <div className="min-h-screen bg-black text-zinc-50 [font-family:'Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2 text-base font-medium tracking-tight text-zinc-100">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]" />
            FxInsites
          </Link>
          <Link href="/blog" className="text-sm text-zinc-500 hover:text-zinc-300">
            ← Back to blog
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-14">
        <BlogHeaderImage title={post.title} variant={post.headerVariant} />
        <h1 className="mt-8 text-3xl font-medium tracking-tight text-zinc-50">{post.title}</h1>
        <p className="mt-2 text-sm text-zinc-500">{formatPostDate(post.date)}</p>

        <article>
          <Post />
        </article>
      </main>
    </div>
  );
}
