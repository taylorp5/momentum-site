import {
  CreditCard,
  Crosshair,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  PieChart,
  Settings,
  Share2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
  /** Hide unless the user is on Pro */
  proOnly?: boolean;
};

export const mainNav: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "Focus Mode",
    href: "/focus",
    icon: Crosshair,
  },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Distribution", href: "/distribution", icon: Share2 },
  { title: "Expenses", href: "/costs", icon: CreditCard },
  { title: "Financials", href: "/financials", icon: Landmark },
  {
    title: "Reports",
    href: "/reports",
    icon: PieChart,
    disabled: true,
    badge: "Coming soon",
  },
  { title: "Settings", href: "/settings", icon: Settings },
];

/** Roadmap / preview links; hidden in the sidebar when empty. */
export const futureNav: NavItem[] = [];
