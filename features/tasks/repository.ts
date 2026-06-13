import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { TaskSummary, TaskStatus, PersonSummary } from "@/lib/types";
import type { TaskFilters } from "./schema";

interface TaskRow {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  budget: number;
  deadline: string;
  status: TaskStatus;
  skills: string[];
  proposal_count: number;
  created_at: string;
  category: { name: string; slug: string } | null;
  selected_worker_id?: string | null;
}

interface ProfileRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  college: string | null;
  rating_avg: number;
  rating_count: number;
}

function toPerson(p: ProfileRow | undefined, fallbackId: string): PersonSummary {
  return {
    id: p?.user_id ?? fallbackId,
    name: p?.full_name || "Student",
    avatarUrl: p?.avatar_url ?? undefined,
    college: p?.college || "—",
    ratingAvg: p?.rating_avg ?? 0,
    ratingCount: p?.rating_count ?? 0,
  };
}

/** Batch-fetch poster profiles and merge into task rows → UI TaskSummary[]. */
async function attachPosters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: TaskRow[]
): Promise<TaskSummary[]> {
  const posterIds = [...new Set(rows.map((r) => r.poster_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, college, rating_avg, rating_count")
    .in("user_id", posterIds);

  const byId = new Map<string, ProfileRow>(
    (profiles ?? []).map((p) => [p.user_id, p as ProfileRow])
  );

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category ?? { name: "General", slug: "general" },
    budget: r.budget,
    deadline: r.deadline,
    status: r.status,
    skills: r.skills ?? [],
    proposalCount: r.proposal_count ?? 0,
    poster: toPerson(byId.get(r.poster_id), r.poster_id),
    selectedWorkerId: r.selected_worker_id ?? null,
  }));
}

/** List open marketplace tasks with filters. Returns [] if Supabase unconfigured. */
export async function listTasks(filters: TaskFilters): Promise<TaskSummary[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();

  let query = supabase
    .from("tasks")
    .select(
      "id, poster_id, title, description, budget, deadline, status, skills, proposal_count, created_at, category:categories(name, slug), selected_worker_id"
    )
    .eq("status", "open");

  if (filters.q) {
    query = query.ilike("title", `%${filters.q}%`);
  }
  if (filters.category) {
    // filter by category slug via the joined relation
    query = query.eq("categories.slug", filters.category);
  }
  if (filters.minBudget != null) {
    query = query.gte("budget", Math.round(filters.minBudget * 100));
  }
  if (filters.maxBudget != null) {
    query = query.lte("budget", Math.round(filters.maxBudget * 100));
  }

  switch (filters.sort) {
    case "budget_high":
      query = query.order("budget", { ascending: false });
      break;
    case "budget_low":
      query = query.order("budget", { ascending: true });
      break;
    case "deadline":
      query = query.order("deadline", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(60);
  if (error || !data) return [];

  return attachPosters(supabase, data as unknown as TaskRow[]);
}

export interface TaskDetail extends TaskSummary {
  description: string;
  createdAt: string;
}

/** Fetch a single task with poster info. Returns null if not found/unconfigured. */
export async function getTask(id: string): Promise<TaskDetail | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, poster_id, title, description, budget, deadline, status, skills, proposal_count, created_at, category:categories(name, slug), selected_worker_id"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const [summary] = await attachPosters(supabase, [data as unknown as TaskRow]);
  return {
    ...summary,
    description: (data as unknown as TaskRow).description,
    createdAt: (data as unknown as TaskRow).created_at,
  };
}

