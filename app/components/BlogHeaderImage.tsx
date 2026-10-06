// A branded, generated header banner instead of a stock photo: the same
// dark/emerald blob-glow already used on the landing page, plus a simple
// rising equity-curve-style line, which fits "logical, process-driven
// trading" better than a generic finance stock image would.
export function BlogHeaderImage({ title }: { title: string }) {
  return (
    <div
      role="img"
      aria-label={title}
      className="relative h-56 w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 sm:h-72"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="blob absolute left-[15%] top-[-60px] h-[220px] w-[220px] rounded-full bg-emerald-500/25 blur-[80px]" />
        <div
          className="blob absolute right-[10%] top-[40%] h-[180px] w-[180px] rounded-full bg-emerald-400/15 blur-[70px]"
          style={{ animationDelay: "-6s" }}
        />
      </div>
      <svg viewBox="0 0 800 280" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <path
          d="M 0 220 L 80 190 L 140 210 L 220 140 L 300 165 L 380 100 L 460 125 L 540 70 L 620 95 L 700 40 L 800 60"
          fill="none"
          stroke="rgb(52 211 153)"
          strokeOpacity="0.6"
          strokeWidth="2"
        />
      </svg>
      <span className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.7)]" />
    </div>
  );
}
