/** Shared UI-facing domain types. Mirrors SPEC.md §4 (subset for foundation/demo). */

export type TaskStatus =
  | "open"
  | "in_progress"
  | "submitted"
  | "completed"
  | "disputed"
  | "cancelled";

export interface PersonSummary {
  id: string;
  name: string;
  avatarUrl?: string;
  college: string;
  ratingAvg: number;
  ratingCount: number;
}

export interface TaskSummary {
  id: string;
  title: string;
  category: { name: string; slug: string };
  /** integer paise */
  budget: number;
  deadline: string;
  status: TaskStatus;
  skills: string[];
  proposalCount: number;
  poster: PersonSummary;
  selectedWorkerId?: string | null;
}


export type AchievementBadge =
  | "rising_star"
  | "top_performer"
  | "fast_delivery"
  | "trusted_worker";

export interface LeaderboardEntry {
  rank: number;
  user: PersonSummary;
  performanceScore: number;
  completedTasks: number;
  onTimeRate: number;
  badges: AchievementBadge[];
}
