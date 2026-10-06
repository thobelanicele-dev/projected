// Branded, generated header banners instead of stock photos: the same
// dark/emerald blob-glow already used on the landing page, with a motif
// per post rather than always a photo.
export function BlogHeaderImage({
  title,
  variant = "chart",
}: {
  title: string;
  variant?: "chart" | "guide";
}) {
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
      {variant === "chart" ? (
        <>
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
        </>
      ) : (
        // A winding, dashed route from a start point to a flagged finish,
        // fitting a walkthrough/guide better than the results-style line.
        <svg viewBox="0 0 800 280" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <path
            d="M 70 210 C 170 210, 170 120, 270 120 S 380 50, 470 60 S 560 170, 650 160 S 720 90, 730 75"
            fill="none"
            stroke="rgb(52 211 153)"
            strokeOpacity="0.55"
            strokeWidth="2.5"
            strokeDasharray="10 9"
            strokeLinecap="round"
          />
          <circle cx="70" cy="210" r="7" fill="rgb(52 211 153)" />
          <circle cx="70" cy="210" r="13" fill="none" stroke="rgb(52 211 153)" strokeOpacity="0.4" strokeWidth="1.5" />
          <g transform="translate(730, 75)">
            <line x1="0" y1="0" x2="0" y2="-36" stroke="rgb(52 211 153)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 0 -36 L 26 -29 L 0 -22 Z" fill="rgb(52 211 153)" />
          </g>
        </svg>
      )}
    </div>
  );
}
