import {
  LayoutDashboard,
  Search,
  Briefcase,
  MessageSquare,
  Wallet,
  Trophy,
  User,
  Plus,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Show in mobile bottom nav. */
  mobile?: boolean;
}

export const primaryNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, mobile: true },
  { label: "Browse Tasks", href: "/tasks", icon: Search, mobile: true },
  { label: "Post a Task", href: "/tasks/new", icon: Plus, mobile: true },
  { label: "My Work", href: "/my-work", icon: Briefcase },
  { label: "Chat", href: "/chat", icon: MessageSquare, mobile: true },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Profile", href: "/profile", icon: User, mobile: true },
];
