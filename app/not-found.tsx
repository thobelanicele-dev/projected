import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center text-zinc-50 [font-family:'Helvetica_Neue',Helvetica,Arial,sans-serif]">
      <span className="flex items-center gap-2 text-base font-medium tracking-tight text-zinc-100">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]" />
        FxInsites
      </span>

      <p className="mt-10 text-sm uppercase tracking-widest text-zinc-600">404</p>
      <h1 className="mt-2 text-2xl font-medium tracking-tight text-zinc-50 sm:text-3xl">
        This page doesn&apos;t exist.
      </h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-500">
        The link might be broken, or the page may have moved. Let&apos;s get you back on track.
      </p>

      <Link
        href="/"
        className="mt-8 inline-block border border-zinc-100 bg-zinc-100 px-6 py-2.5 text-sm font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-300 hover:shadow-[0_0_30px_-6px_rgba(52,211,153,0.6)]"
      >
        Back to home
      </Link>
    </div>
  );
}
