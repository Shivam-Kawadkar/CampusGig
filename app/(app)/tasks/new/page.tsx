import { Metadata } from "next";
import { PostTaskForm } from "@/features/tasks/components/post-task-form";

export const metadata: Metadata = {
  title: "Post a task - CampusGig",
  description: "Create a new micro-task for your campus.",
};

export default function NewTaskPage() {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Post a new task</h1>
        <p className="mt-2 text-muted-foreground">
          Fill in the details below to broadcast your task to workers on your campus.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-6 shadow-soft">
        <PostTaskForm />
      </div>
    </div>
  );
}
