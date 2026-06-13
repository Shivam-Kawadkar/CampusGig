import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, ArrowLeft, Shield, Sparkles, MessageSquare, Award, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getTask } from "@/features/tasks/repository";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingStars } from "@/components/shared/rating-stars";
import { deadlineLabel, formatINR, initials } from "@/lib/utils";
import { ProposalForm } from "@/features/tasks/components/proposal-form";
import { ProposalsList, type ProposalDetail } from "@/features/tasks/components/proposals-list";
import { SubmitWorkForm } from "@/features/submissions/components/submit-work-form";
import { ReviewDeliverables } from "@/features/submissions/components/review-deliverables";
import { LeaveReviewForm } from "@/features/reviews/components/leave-review-form";
import { FileDisputeForm, SubmitEvidenceForm } from "@/features/disputes/components/dispute-forms";

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const task = await getTask(id);

  if (!task) {
    notFound();
  }

  const supabase = await createClient();
  const isPoster = task.poster.id === user.id;

  // 1. Fetch worker proposal if the current user is a worker (to check proposal status)
  let userProposal = null;
  if (!isPoster) {
    const { data: proposal } = await supabase
      .from("applications")
      .select("id, bid_amount, message, estimated_delivery, status")
      .eq("task_id", id)
      .eq("worker_id", user.id)
      .maybeSingle();

    if (proposal) {
      userProposal = {
        id: proposal.id,
        bidAmount: proposal.bid_amount,
        message: proposal.message,
        estimatedDelivery: proposal.estimated_delivery,
        status: proposal.status,
      };
    }
  }

  // 2. Fetch all proposals if the current user is the task poster
  let proposals: ProposalDetail[] = [];
  if (isPoster) {
    const { data: apps } = await supabase
      .from("applications")
      .select("id, bid_amount, message, estimated_delivery, status, worker_id")
      .eq("task_id", id);

    if (apps && apps.length > 0) {
      const workerIds = apps.map((a) => a.worker_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, college, rating_avg, rating_count")
        .in("user_id", workerIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      proposals = apps.map((a) => ({
        id: a.id,
        bidAmount: a.bid_amount,
        message: a.message,
        estimatedDelivery: a.estimated_delivery,
        status: a.status,
        worker: {
          id: a.worker_id,
          name: profileMap.get(a.worker_id)?.full_name || "Student",
          avatarUrl: profileMap.get(a.worker_id)?.avatar_url || undefined,
          college: profileMap.get(a.worker_id)?.college || "—",
          ratingAvg: profileMap.get(a.worker_id)?.rating_avg || 0,
          ratingCount: profileMap.get(a.worker_id)?.rating_count || 0,
        },
      }));
    }
  }

  // 3. Fetch submissions/deliverables
  const { data: submissions } = await supabase
    .from("submissions")
    .select("*")
    .eq("task_id", id)
    .order("created_at", { ascending: false });

  const latestSubmission = submissions && submissions.length > 0 ? submissions[0] : null;

  // 4. Fetch selected worker profile
  let workerProfile = null;
  if (task.selectedWorkerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, college, rating_avg, rating_count")
      .eq("user_id", task.selectedWorkerId)
      .maybeSingle();

    if (profile) {
      workerProfile = {
        id: profile.user_id,
        name: profile.full_name,
        avatarUrl: profile.avatar_url,
        college: profile.college,
        ratingAvg: profile.rating_avg,
        ratingCount: profile.rating_count,
      };
    }
  }

  // 5. Fetch chat room ID if worker selected
  let chatRoomId = null;
  if (task.selectedWorkerId) {
    const { data: chat } = await supabase
      .from("chats")
      .select("id")
      .eq("task_id", id)
      .maybeSingle();
    if (chat) {
      chatRoomId = chat.id;
    }
  }

  // 6. Fetch reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select("*")
    .eq("task_id", id);

  const workerReviewedPoster = reviews?.some(
    (r) => r.reviewer_id === user.id && r.role_context === "worker_to_poster"
  );
  const posterReviewedWorker = reviews?.some(
    (r) => r.reviewer_id === user.id && r.role_context === "poster_to_worker"
  );

  const posterReview = reviews?.find(
    (r) => r.role_context === "poster_to_worker"
  );
  const workerReview = reviews?.find(
    (r) => r.role_context === "worker_to_poster"
  );

  // 7. Fetch dispute if any
  let activeDispute = null;
  let disputeEvidence: Array<{ id: string; submitter_id: string; submitter_name: string; comment: string; created_at: string }> = [];

  if (task.status === "disputed") {
    const { data: disputeRow } = await supabase
      .from("disputes")
      .select("id, disputer_id, reason, explanation, status, resolution_decision, resolution_details, created_at")
      .eq("task_id", id)
      .eq("status", "opened")
      .maybeSingle();

    if (disputeRow) {
      activeDispute = disputeRow;

      const { data: evidenceRows } = await supabase
        .from("dispute_evidence")
        .select("id, submitter_id, comment, created_at")
        .eq("dispute_id", disputeRow.id)
        .order("created_at", { ascending: true });

      if (evidenceRows) {
        for (const ev of evidenceRows) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", ev.submitter_id)
            .maybeSingle();
          disputeEvidence.push({
            id: ev.id,
            submitter_id: ev.submitter_id,
            submitter_name: prof?.full_name ?? "User",
            comment: ev.comment,
            created_at: ev.created_at,
          });
        }
      }
    }
  }

  const isTaskOpen = task.status === "open";
  const overdue = deadlineLabel(task.deadline) === "Overdue";
  const isPartyToTask =
    isPoster || task.selectedWorkerId === user.id;
  const canFileDispute =
    isPartyToTask &&
    ["in_progress", "submitted"].includes(task.status) &&
    !activeDispute;

  const statusVariant: "accent" | "warning" | "default" | "destructive" | "secondary" =
    task.status === "open"
      ? "accent"
      : task.status === "in_progress"
        ? "warning"
        : task.status === "completed"
          ? "default"
          : task.status === "cancelled" || task.status === "disputed"
            ? "destructive"
            : "secondary";

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button asChild variant="ghost" className="pl-0 hover:bg-transparent">
          <Link href="/tasks" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to marketplace
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left main details card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-soft space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-2">
                <Badge variant="accent">{task.category.name}</Badge>
                <Badge
                  variant={statusVariant}
                  className="capitalize"
                >
                  {task.status.replace("_", " ")}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                Posted on {new Date(task.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {task.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-4" />
                  Deadline: <span className={overdue ? "text-destructive font-medium" : ""}>{deadlineLabel(task.deadline)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-4" />
                  {new Date(task.deadline).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="font-semibold text-foreground">Description</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {task.description}
              </p>
            </div>

            {task.skills.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">Skills Required</h3>
                <div className="flex flex-wrap gap-2">
                  {task.skills.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dispute Banner */}
          {task.status === "disputed" && activeDispute && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-destructive shrink-0" />
                <h2 className="text-base font-bold text-destructive">Dispute In Progress</h2>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Original Complaint</p>
                <p className="leading-relaxed text-foreground/80">&ldquo;{activeDispute.explanation}&rdquo;</p>
              </div>

              {disputeEvidence.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <MessageSquare className="size-3.5" /> Evidence Thread ({disputeEvidence.length})
                  </p>
                  <div className="space-y-2">
                    {disputeEvidence.map((ev) => (
                      <div key={ev.id} className={`rounded-lg border px-3 py-2 text-xs ${ev.submitter_id === user.id ? "bg-primary/5 border-primary/20" : "bg-muted/30"}` }>
                        <p className="font-semibold">{ev.submitter_name} {ev.submitter_id === user.id && "(You)"}</p>
                        <p className="text-foreground/70 mt-0.5 leading-relaxed">{ev.comment}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{new Date(ev.created_at).toLocaleString("en-IN")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Evidence</p>
                <SubmitEvidenceForm disputeId={activeDispute.id} taskId={id} />
              </div>
            </div>
          )}

          {/* Submissions Section */}
          {task.status !== "open" && latestSubmission && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Deliverables History</h2>
              <ReviewDeliverables submission={latestSubmission} isPoster={isPoster} />
            </div>
          )}

          {/* Reviews Section */}
          {task.status === "completed" && reviews && reviews.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Award className="size-5 text-warning" />
                Feedback & Reviews
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {posterReview && workerProfile && (
                  <div className="rounded-xl border bg-card p-4 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">From Poster</span>
                      </div>
                      <RatingStars rating={posterReview.rating} size={14} />
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      &ldquo;{posterReview.comment || "No comment left."}&rdquo;
                    </p>
                    <p className="text-[10px] text-muted-foreground text-right">
                      Reviewed {workerProfile.name}
                    </p>
                  </div>
                )}
                {workerReview && (
                  <div className="rounded-xl border bg-card p-4 space-y-2.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase">From Worker</span>
                      </div>
                      <RatingStars rating={workerReview.rating} size={14} />
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      &ldquo;{workerReview.comment || "No comment left."}&rdquo;
                    </p>
                    <p className="text-[10px] text-muted-foreground text-right">
                      Reviewed {task.poster.name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Proposals section below details */}
          {isPoster && isTaskOpen && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Proposals ({proposals.length})</h2>
                <span className="text-sm text-muted-foreground">Compare bids and choose a worker</span>
              </div>
              <ProposalsList taskId={id} proposals={proposals} isTaskOpen={isTaskOpen} />
            </div>
          )}
        </div>

        {/* Right sidebar details */}
        <div className="space-y-6">
          {/* Budget & poster card */}
          <div className="rounded-xl border bg-card p-6 shadow-soft space-y-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Budget</p>
              <p className="text-3xl font-extrabold text-accent mt-1 tracking-tight">
                {formatINR(task.budget)}
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="size-3.5 text-success" />
                <span>Held in escrow until work is approved</span>
              </div>
            </div>

            <div className="border-t pt-5 space-y-3.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Task Poster</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={task.poster.avatarUrl} alt={task.poster.name} />
                  <AvatarFallback>{initials(task.poster.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-medium text-sm">{task.poster.name}</h4>
                  <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {task.poster.college}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RatingStars rating={task.poster.ratingAvg} size={13} />
                <span>({task.poster.ratingCount} ratings)</span>
              </div>
            </div>

            {/* Selected Worker Panel */}
            {task.selectedWorkerId && workerProfile && (
              <div className="border-t pt-5 space-y-3.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Assigned Worker</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={workerProfile.avatarUrl} alt={workerProfile.name} />
                    <AvatarFallback>{initials(workerProfile.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium text-sm">{workerProfile.name}</h4>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {workerProfile.college}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <RatingStars rating={workerProfile.ratingAvg} size={13} />
                  <span>({workerProfile.ratingCount} ratings)</span>
                </div>
                
                {chatRoomId && (
                  <Button asChild className="w-full mt-2" variant="outline">
                    <Link href={`/chat/${chatRoomId}`} className="flex items-center justify-center gap-2">
                      <MessageSquare className="size-4" />
                      Coordinate in Chat
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Action cards based on role */}
          {/* Worker Actions card */}
          {!isPoster && (
            <div className="rounded-xl border bg-card p-6 shadow-soft space-y-4">
              <h3 className="font-semibold flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                <span>Worker Dashboard</span>
              </h3>

              {isTaskOpen ? (
                userProposal ? (
                  <div className="space-y-4 bg-muted/30 border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Proposal</span>
                      <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent capitalize">
                        {userProposal.status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Proposed Bid</span>
                        <p className="font-bold text-foreground">{formatINR(userProposal.bidAmount)}</p>
                      </div>
                      {userProposal.message && (
                        <div>
                          <span className="text-xs text-muted-foreground">Your Message</span>
                          <p className="text-xs text-foreground/80 italic leading-relaxed mt-0.5">
                            &ldquo;{userProposal.message}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Propose your bid amount and delivery date to apply for this task.
                    </p>
                    <ProposalForm taskId={id} defaultBudgetRupees={task.budget / 100} />
                  </div>
                )
              ) : task.selectedWorkerId === user.id ? (
                <div className="space-y-4 pt-2">
                  {task.status === "in_progress" || (task.status === "submitted" && latestSubmission?.status === "revision_requested") ? (
                    <div>
                      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        You have been selected to complete this task. Submit your deliverables once ready.
                      </p>
                      <SubmitWorkForm taskId={id} />
                    </div>
                  ) : task.status === "submitted" ? (
                    <div className="bg-muted/30 border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground space-y-2">
                      <CheckCircle2 className="size-5 text-warning mx-auto" />
                      <p className="font-semibold text-foreground">Deliverables Submitted</p>
                      <p className="leading-relaxed">Waiting for the poster to review and approve your work.</p>
                    </div>
                  ) : task.status === "completed" ? (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 rounded-lg p-4 text-center text-xs text-emerald-800 dark:text-emerald-400 space-y-1">
                        <CheckCircle2 className="size-5 text-emerald-500 mx-auto" />
                        <p className="font-bold">Task Completed!</p>
                        <p>Earnings credited to your wallet balance.</p>
                      </div>
                      {!workerReviewedPoster ? (
                        <LeaveReviewForm
                          taskId={id}
                          revieweeId={task.poster.id}
                          revieweeName={task.poster.name}
                          roleContext="worker_to_poster"
                        />
                      ) : (
                        <div className="text-center text-xs text-muted-foreground italic py-2">
                          Thank you! You left feedback for this poster.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted/30 border rounded-lg p-4 text-center text-xs text-muted-foreground">
                      Task is {task.status.replace("_", " ")}.
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-muted/30 border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
                  This task is no longer accepting proposals.
                </div>
              )}

              {/* File Dispute — for in-progress/submitted tasks */}
              {canFileDispute && task.selectedWorkerId === user.id && (
                <div className="pt-2 border-t">
                  <FileDisputeForm taskId={id} />
                </div>
              )}
            </div>
          )}

          {/* Poster File Dispute — poster side */}
          {isPoster && canFileDispute && (
            <div className="rounded-xl border bg-card p-6 shadow-soft space-y-4">
              <h3 className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-destructive" />
                <span>Dispute Management</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If there is an issue with the work or the worker, you may file a dispute for review by our admin team.
              </p>
              <FileDisputeForm taskId={id} />
            </div>
          )}

          {/* Poster Review submission if completed */}
          {isPoster && task.status === "completed" && workerProfile && (
            <div className="rounded-xl border bg-card p-6 shadow-soft space-y-4">
              <h3 className="font-semibold flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                <span>Poster Dashboard</span>
              </h3>
              {!posterReviewedWorker ? (
                <LeaveReviewForm
                  taskId={id}
                  revieweeId={workerProfile.id}
                  revieweeName={workerProfile.name}
                  roleContext="poster_to_worker"
                />
              ) : (
                <div className="text-center text-xs text-muted-foreground italic">
                  Feedback left for {workerProfile.name}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
