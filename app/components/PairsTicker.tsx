import { POPULAR_PAIRS } from "@/app/lib/pairs";

/** A slow, endlessly scrolling strip of the markets you can plan and test in the app. */
export function PairsTicker() {
  // Twice, so the second copy slides into the place of the first.
  const items = [...POPULAR_PAIRS, ...POPULAR_PAIRS];

  return (
    <div
      className="marquee relative overflow-hidden border-b border-zinc-900 py-4"
      style={{
        maskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent)",
      }}
    >
      <div className="marquee-track flex w-max items-center gap-10 whitespace-nowrap font-mono text-xs text-zinc-500">
        {items.map((pair, i) => (
          <span key={i} aria-hidden={i >= POPULAR_PAIRS.length} className="flex items-center gap-10">
            {pair.value}
            <span className="h-1 w-1 rounded-full bg-zinc-700" />
          </span>
        ))}
      </div>
    </div>
  );
}
