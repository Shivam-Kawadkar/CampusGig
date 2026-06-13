"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TASK_CATEGORIES } from "../categories";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "budget_high", label: "Budget: High → Low" },
  { value: "budget_low", label: "Budget: Low → High" },
  { value: "deadline", label: "Deadline soonest" },
] as const;

export function TaskFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const activeCategory = params.get("category") ?? "";
  const activeSort = params.get("sort") ?? "newest";
  const q = params.get("q") ?? "";
  const minBudget = params.get("minBudget") ?? "";
  const maxBudget = params.get("maxBudget") ?? "";

  const setParam = React.useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router]
  );

  const [search, setSearch] = React.useState(q);
  const [minVal, setMinVal] = React.useState(minBudget);
  const [maxVal, setMaxVal] = React.useState(maxBudget);

  React.useEffect(() => setSearch(q), [q]);
  React.useEffect(() => setMinVal(minBudget), [minBudget]);
  React.useEffect(() => setMaxVal(maxBudget), [maxBudget]);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (search.trim()) next.set("q", search.trim()); else next.delete("q");
    router.push(`${pathname}?${next.toString()}`);
  }

  function applyBudget() {
    const next = new URLSearchParams(params.toString());
    if (minVal) next.set("minBudget", minVal); else next.delete("minBudget");
    if (maxVal) next.set("maxBudget", maxVal); else next.delete("maxBudget");
    router.push(`${pathname}?${next.toString()}`);
  }

  const hasFilters = !!(activeCategory || q || activeSort !== "newest" || minBudget || maxBudget);

  return (
    <div className="space-y-4">
      {/* Row 1: Search + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={onSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="pl-9"
          />
        </form>

        <select
          value={activeSort}
          onChange={(e) => setParam("sort", e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Row 2: Budget range */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="size-4 text-muted-foreground shrink-0" />
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">₹</span>
          <input
            type="number"
            min="0"
            step="1"
            value={minVal}
            onChange={(e) => setMinVal(e.target.value)}
            onBlur={applyBudget}
            onKeyDown={(e) => e.key === "Enter" && applyBudget()}
            placeholder="Min"
            className="h-9 w-24 rounded-lg border border-input bg-background pl-6 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
          />
        </div>
        <span className="text-xs text-muted-foreground">–</span>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">₹</span>
          <input
            type="number"
            min="0"
            step="1"
            value={maxVal}
            onChange={(e) => setMaxVal(e.target.value)}
            onBlur={applyBudget}
            onKeyDown={(e) => e.key === "Enter" && applyBudget()}
            placeholder="Max"
            className="h-9 w-24 rounded-lg border border-input bg-background pl-6 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary"
          />
        </div>
        {(minBudget || maxBudget) && (
          <button
            onClick={() => {
              setMinVal("");
              setMaxVal("");
              const next = new URLSearchParams(params.toString());
              next.delete("minBudget");
              next.delete("maxBudget");
              router.push(`${pathname}?${next.toString()}`);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        )}
        <span className="text-[11px] text-muted-foreground hidden sm:block">
          Budget range (₹ rupees)
        </span>
      </div>

      {/* Row 3: Category chips */}
      <div className="flex flex-wrap gap-2">
        <Chip
          active={!activeCategory}
          onClick={() => setParam("category", null)}
        >
          All
        </Chip>
        {TASK_CATEGORIES.map((c) => (
          <Chip
            key={c.slug}
            active={activeCategory === c.slug}
            onClick={() =>
              setParam("category", activeCategory === c.slug ? null : c.slug)
            }
          >
            {c.name}
          </Chip>
        ))}

        {hasFilters && (
          <button
            onClick={() => router.push(pathname)}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
