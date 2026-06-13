import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Calendar, Briefcase, Star, Award, MapPin, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/shared/rating-stars";
import { initials } from "@/lib/utils";

interface ProfileDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfileDetailPage({ params }: ProfileDetailPageProps) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const supabase = await createClient();

  // 1. Fetch user's profile
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();

  if (pErr || !profile) {
    notFound();
  }

  // 2. Fetch user details (like role/email)
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", id)
    .maybeSingle();

  // 3. Fetch reviews where this user is the reviewee
  const { data: reviewsData } = await supabase
    .from("reviews")
    .select(`
      id,
      task_id,
      reviewer_id,
      rating,
      comment,
      created_at,
      task:tasks(title)
    `)
    .eq("reviewee_id", id)
    .order("created_at", { ascending: false });

  interface ReviewItem {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    taskTitle: string;
    reviewer: {
      id: string;
      name: string;
      avatarUrl?: string;
      college: string;
    };
  }

  // 4. Batch-fetch reviewer profiles
  let reviews: ReviewItem[] = [];

  if (reviewsData && reviewsData.length > 0) {
    const reviewerIds = [...new Set(reviewsData.map((r) => r.reviewer_id))];
    const { data: reviewerProfiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, college")
      .in("user_id", reviewerIds);

    const reviewerMap = new Map(reviewerProfiles?.map((p) => [p.user_id, p]));

    reviews = reviewsData.map((r) => {
      const taskObj = r.task as unknown as { title: string } | null;
      const reviewer = reviewerMap.get(r.reviewer_id);
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        taskTitle: taskObj?.title || "Gig Task",
        reviewer: {
          id: r.reviewer_id,
          name: reviewer?.full_name || "Student",
          avatarUrl: reviewer?.avatar_url || undefined,
          college: reviewer?.college || "—",
        },
      };
    });
  }

  const isOwnProfile = currentUser.id === id;

  return (
    <div className="space-y-6">
      {/* Back to marketplace */}
      <div>
        <Button asChild variant="ghost" className="pl-0 hover:bg-transparent">
          <Link href="/tasks" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to marketplace
          </Link>
        </Button>
      </div>

      {/* Profile Cover & Header Card */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-soft">
        <div className="h-32 bg-gradient-to-r from-primary/30 via-secondary/20 to-accent/20" />
        <div className="relative px-6 pb-6">
          <div className="absolute -top-12 left-6">
            <Avatar className="h-24 w-24 border-4 border-card ring-1 ring-muted shadow-md">
              <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {initials(profile.full_name || "Student")}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="pt-16 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {profile.full_name || "Student"}
                </h1>
                {profile.is_verified_student && (
                  <Badge variant="accent" className="text-[10px] font-semibold tracking-wider uppercase">
                    Verified Student
                  </Badge>
                )}
                {userData?.role === "admin" && (
                  <Badge variant="destructive" className="text-[10px] font-semibold tracking-wider uppercase">
                    Admin
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <GraduationCap className="size-4 text-muted-foreground" />
                {profile.college || "No College Added"}
              </p>
            </div>

            {isOwnProfile && (
              <Button asChild variant="outline" size="sm" className="md:self-start gap-1.5">
                <Link href="/profile/edit">
                  <Pencil className="size-3.5" />
                  Edit Profile
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Stats & Meta */}
        <div className="space-y-6 md:col-span-1">
          {/* Reputation Card */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold tracking-tight">Reputation Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-dashed">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Star className="size-4 text-warning" />
                  Average Rating
                </span>
                <div className="flex flex-col items-end">
                  <RatingStars rating={profile.rating_avg} size={13} />
                  <span className="text-xs font-semibold mt-0.5">{profile.rating_avg.toFixed(1)} / 5.0</span>
                </div>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-dashed">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Briefcase className="size-4 text-primary" />
                  Completed Gigs
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {profile.completed_gigs} gigs
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Award className="size-4 text-secondary" />
                  Total Ratings
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {profile.rating_count} reviews
                </span>
              </div>
            </div>
          </div>

          {/* About / Details Card */}
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold tracking-tight">Academic Details</h3>
            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-muted-foreground uppercase text-[10px]">College</p>
                  <p className="text-foreground mt-0.5">{profile.college || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <GraduationCap className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-muted-foreground uppercase text-[10px]">Course / Major</p>
                  <p className="text-foreground mt-0.5">{profile.course || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-muted-foreground uppercase text-[10px]">Year of Study</p>
                  <p className="text-foreground mt-0.5">{profile.year_of_study ? `Year ${profile.year_of_study}` : "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Reviews & Feed (2/3 width) */}
        <div className="space-y-6 md:col-span-2">
          {/* Bio */}
          {profile.bio && (
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-2.5">
              <h3 className="font-semibold text-foreground">About Me</h3>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Skills */}
          {(profile as unknown as { skills?: string[] }).skills?.length ? (
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-3">
              <h3 className="font-semibold text-foreground">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {((profile as unknown as { skills?: string[] }).skills ?? []).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Reviews List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Award className="size-5 text-warning" />
              Campus Reviews ({reviews.length})
            </h2>

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div key={rev.id} className="rounded-xl border bg-card p-5 space-y-3 shadow-sm hover:shadow-soft transition-all">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={rev.reviewer.avatarUrl} alt={rev.reviewer.name} />
                          <AvatarFallback>{initials(rev.reviewer.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link href={`/profile/${rev.reviewer.id}`} className="font-semibold text-sm hover:text-primary transition-colors">
                            {rev.reviewer.name}
                          </Link>
                          <p className="text-[10px] text-muted-foreground">{rev.reviewer.college}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <RatingStars rating={rev.rating} size={12} />
                        <span className="text-[9px] text-muted-foreground tabular-nums mt-0.5">
                          {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm italic text-foreground/80 leading-relaxed pl-1 border-l-2 border-primary/20">
                      &ldquo;{rev.comment || "No comment left."}&rdquo;
                    </p>

                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      Gig: {rev.taskTitle}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center bg-card shadow-soft text-muted-foreground text-sm py-12">
                <Star className="size-8 mx-auto text-muted mb-3" />
                <p className="font-semibold text-foreground">No reviews yet</p>
                <p className="text-xs mt-1.5">Completed tasks and peer reviews will show up here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
