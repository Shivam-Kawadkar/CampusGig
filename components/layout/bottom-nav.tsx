"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { primaryNav } from "./nav-config";

export function BottomNav() {
  const pathname = usePathname();
  const items = primaryNav.filter((i) => i.mobile);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t bg-background/90 backdrop-blur-md lg:hidden">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const Icon = item.icon;
        const isPost = item.href === "/tasks/new";

        if (isPost) {
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="grid h-12 w-12 -translate-y-3 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-lift"
            >
              <Icon className="size-6" />
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 text-[10px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            {item.label.split(" ")[0]}
          </Link>
        );
      })}
    </nav>
  );
}
