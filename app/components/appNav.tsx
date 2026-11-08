import type { ComponentType } from "react";

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-[18px] w-[18px] shrink-0",
};

function PlannerIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function RiskCalculatorIcon() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" />
      <circle cx="8" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BacktestIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}

function JournalIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
      <path d="M4 19a2.5 2.5 0 0 1 2.5-2.5H20" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function WeeklyIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
    </svg>
  );
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/planner", label: "Planner", description: "Build a structured trade plan", tourId: "nav-planner", Icon: PlannerIcon },
  {
    href: "/risk-calculator",
    label: "Risk calculator",
    description: "Size positions, check margin, spot correlation",
    tourId: "nav-risk-calculator",
    Icon: RiskCalculatorIcon,
  },
  {
    href: "/backtest",
    label: "Backtest",
    description: "Test a strategy against real price history",
    tourId: "nav-backtest",
    Icon: BacktestIcon,
  },
  {
    href: "/journal",
    label: "Journal",
    description: "Log trades and track outcomes",
    tourId: "nav-journal",
    Icon: JournalIcon,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "See how your plans matched reality",
    tourId: "nav-dashboard",
    Icon: DashboardIcon,
  },
  {
    href: "/weekly",
    label: "Weekly summary",
    description: "Your week in trades, and where to improve",
    tourId: "nav-weekly",
    Icon: WeeklyIcon,
  },
];

export function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9h12v-9" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export interface NavItem {
  href: string;
  label: string;
  description: string;
  tourId: string;
  Icon: ComponentType;
}
