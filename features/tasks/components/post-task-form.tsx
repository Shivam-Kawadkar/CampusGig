"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatINR } from "@/lib/utils";
import { TASK_CATEGORIES } from "../categories";
import { createTaskSchema, type CreateTaskInput } from "../schema";
import { createTask } from "../actions";
import { FileUploader, type UploadedFile } from "@/components/shared/file-uploader";
import { uploadAttachment } from "@/lib/upload-action";

const STEPS = ["Category", "Details", "Budget & Deadline", "Review"] as const;

export function PostTaskForm() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [skillInput, setSkillInput] = React.useState("");
  const [attachments, setAttachments] = React.useState<UploadedFile[]>([]);

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      description: "",
      categorySlug: "",
      budgetRupees: 500,
      skills: [],
      attachmentUrls: [],
    },
  });

  const { register, handleSubmit, watch, setValue, trigger, formState } = form;
  const values = watch();

  async function next() {
    const fieldsByStep: (keyof CreateTaskInput)[][] = [
      ["categorySlug"],
      ["title", "description"],
      ["budgetRupees", "deadline"],
      [],
    ];
    const valid = await trigger(fieldsByStep[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !values.skills.includes(s) && values.skills.length < 8) {
      setValue("skills", [...values.skills, s]);
    }
    setSkillInput("");
  }

  async function onSubmit(data: CreateTaskInput) {
    setSubmitting(true);
    const result = await createTask({
      ...data,
      attachmentUrls: attachments.map((f) => f.url),
    });
    if (result.ok) {
      toast.success("Task posted! 🎉");
      router.push(`/tasks/${result.taskId}`);
      router.refresh();
    } else {
      toast.error("Couldn't post task", { description: result.error });
      setSubmitting(false);
    }
  }

  async function handleUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadAttachment(fd, "task-attachments");
    if (result.ok) {
      setAttachments((prev) => [
        ...prev,
        { name: result.name, url: result.url, size: result.size, type: result.type },
      ]);
    }
    return result;
  }

  return (
    <div>
      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors",
                i < step
                  ? "bg-accent text-accent-foreground"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden text-sm sm:block",
                i === step ? "font-medium" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="ml-2 hidden h-px flex-1 bg-border sm:block" />
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-[280px]"
          >
            {step === 0 && (
              <div>
                <h2 className="text-lg font-semibold">
                  What kind of task is this?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick the category that fits best.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {TASK_CATEGORIES.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => setValue("categorySlug", c.slug)}
                      className={cn(
                        "rounded-xl border p-4 text-sm font-medium transition-all hover:shadow-soft",
                        values.categorySlug === c.slug
                          ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                          : "border-border bg-card"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                {formState.errors.categorySlug && (
                  <p className="mt-2 text-xs text-destructive">
                    {formState.errors.categorySlug.message}
                  </p>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Describe the task</h2>
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g. Design a logo for our college fest"
                    {...register("title")}
                  />
                  {formState.errors.title && (
                    <p className="text-xs text-destructive">
                      {formState.errors.title.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <textarea
                    rows={5}
                    placeholder="Explain what you need, any requirements, deliverables, and context…"
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    {...register("description")}
                  />
                  {formState.errors.description && (
                    <p className="text-xs text-destructive">
                      {formState.errors.description.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Skills needed (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      placeholder="Type a skill and press Enter"
                    />
                    <Button type="button" variant="outline" onClick={addSkill}>
                      Add
                    </Button>
                  </div>
                  {values.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {values.skills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs"
                        >
                          {s}
                          <button
                            type="button"
                            onClick={() =>
                              setValue(
                                "skills",
                                values.skills.filter((x) => x !== s)
                              )
                            }
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* File attachments */}
                <FileUploader
                  label="Reference files (optional)"
                  hint="PDF, images, docs, zip — max 10 MB each"
                  files={attachments}
                  onUpload={handleUpload}
                  onRemove={(url) =>
                    setAttachments((prev) => prev.filter((f) => f.url !== url))
                  }
                  maxFiles={5}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold">Budget & deadline</h2>
                <div className="space-y-1.5">
                  <Label>Budget (₹)</Label>
                  <Input
                    type="number"
                    min={10}
                    max={50000}
                    step={10}
                    {...register("budgetRupees")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Held safely in escrow until you approve the work.
                  </p>
                  {formState.errors.budgetRupees && (
                    <p className="text-xs text-destructive">
                      {formState.errors.budgetRupees.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Deadline</Label>
                  <Input
                    type="datetime-local"
                    {...register("deadline")}
                  />
                  {formState.errors.deadline && (
                    <p className="text-xs text-destructive">
                      {formState.errors.deadline.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Review & post</h2>
                <dl className="divide-y rounded-xl border bg-muted/30">
                  <Row label="Category">
                    {TASK_CATEGORIES.find((c) => c.slug === values.categorySlug)
                      ?.name ?? "—"}
                  </Row>
                  <Row label="Title">{values.title || "—"}</Row>
                  <Row label="Budget">
                    <span className="font-semibold text-accent">
                      {formatINR(Math.round((values.budgetRupees || 0) * 100))}
                    </span>
                  </Row>
                  <Row label="Deadline">
                    {values.deadline
                      ? new Date(values.deadline).toLocaleString("en-IN")
                      : "—"}
                  </Row>
                  <Row label="Skills">
                    {values.skills.length ? values.skills.join(", ") : "—"}
                  </Row>
                </dl>
                <p className="text-sm text-muted-foreground">
                  Once posted, students can send proposals. You&apos;ll fund the
                  task via escrow when you accept one.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" variant="brand" onClick={next}>
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" variant="brand" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Post task
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] truncate text-right font-medium">{children}</dd>
    </div>
  );
}
