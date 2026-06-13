import type { LeaderboardEntry, TaskSummary } from "@/lib/types";

/** Demo data for the foundation/landing showcase. Replaced by Supabase queries later. */

export const demoLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    user: {
      id: "u1",
      name: "Sneha Rao",
      college: "BMS College",
      ratingAvg: 4.95,
      ratingCount: 48,
    },
    performanceScore: 96.4,
    completedTasks: 52,
    onTimeRate: 98,
    badges: ["top_performer", "trusted_worker", "fast_delivery"],
  },
  {
    rank: 2,
    user: {
      id: "u2",
      name: "Arjun Mehta",
      college: "RV University",
      ratingAvg: 4.88,
      ratingCount: 41,
    },
    performanceScore: 92.1,
    completedTasks: 44,
    onTimeRate: 95,
    badges: ["top_performer", "trusted_worker"],
  },
  {
    rank: 3,
    user: {
      id: "u3",
      name: "Priya Nair",
      college: "Christ University",
      ratingAvg: 4.82,
      ratingCount: 37,
    },
    performanceScore: 89.7,
    completedTasks: 39,
    onTimeRate: 92,
    badges: ["fast_delivery", "rising_star"],
  },
];

export const demoTasks: TaskSummary[] = [
  {
    id: "t1",
    title: "Design a logo + brand kit for our college fest",
    category: { name: "Design", slug: "design" },
    budget: 150000,
    deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: "open",
    skills: ["Figma", "Branding", "Illustrator"],
    proposalCount: 7,
    poster: {
      id: "p1",
      name: "Karan Shah",
      college: "PES University",
      ratingAvg: 4.7,
      ratingCount: 12,
    },
  },
  {
    id: "t2",
    title: "Fix React state bug in our hackathon project",
    category: { name: "Coding", slug: "coding" },
    budget: 80000,
    deadline: new Date(Date.now() + 86400000).toISOString(),
    status: "open",
    skills: ["React", "TypeScript", "Debugging"],
    proposalCount: 4,
    poster: {
      id: "p2",
      name: "Divya Iyer",
      college: "RV University",
      ratingAvg: 4.9,
      ratingCount: 20,
    },
  },
  {
    id: "t3",
    title: "Write & format a 2000-word research summary",
    category: { name: "Writing", slug: "writing" },
    budget: 60000,
    deadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: "open",
    skills: ["Research", "Editing", "APA"],
    proposalCount: 9,
    poster: {
      id: "p3",
      name: "Rahul Verma",
      college: "Christ University",
      ratingAvg: 4.6,
      ratingCount: 8,
    },
  },
];
