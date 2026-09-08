import Link from "next/link";

export function LegalPageLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
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
        <h1 className="text-3xl font-medium tracking-tight text-zinc-50">{title}</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated {updated}</p>

        <div className="prose-legal mt-10 flex flex-col gap-8 text-sm leading-relaxed text-zinc-400">
          {children}
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-medium text-zinc-100">{title}</h2>
      <div className="mt-2 flex flex-col gap-2.5">{children}</div>
    </section>
  );
}
