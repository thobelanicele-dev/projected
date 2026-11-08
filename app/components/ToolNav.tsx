"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, HomeIcon } from "@/app/components/appNav";

const SHORT: Record<string, string> = { "Risk calculator": "Risk", "Weekly summary": "Weekly" };

/** The six tools as a strip in the top bar. Icons only on narrower screens, with the name shown from xl up. */
export function ToolNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Tools" className="hidden items-center gap-0.5 md:flex">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={item.tourId}
            title={item.description}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors ${
              active ? "bg-zinc-900 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
            }`}
          >
            <item.Icon />
            <span className="hidden whitespace-nowrap xl:inline">{SHORT[item.label] ?? item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const TAB_HREFS = ["/planner", "/risk-calculator", "/backtest", "/journal"];

/** Phone-only bar fixed to the bottom: Home plus the four tools used most. Dashboard and weekly are one tap away on the Home page. */
export function BottomTabBar() {
  const pathname = usePathname();
  const items = [
    { href: "/home", label: "Home", tourId: undefined as string | undefined, Icon: HomeIcon },
    ...NAV_ITEMS.filter((n) => TAB_HREFS.includes(n.href)).map((n) => ({
      href: n.href,
      label: n.label === "Risk calculator" ? "Risk" : n.label,
      tourId: n.tourId,
      Icon: n.Icon,
    })),
  ];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tour={item.tourId}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              active ? "text-zinc-50" : "text-zinc-500"
            }`}
          >
            <item.Icon />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
