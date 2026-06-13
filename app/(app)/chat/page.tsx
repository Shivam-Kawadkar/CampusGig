import Link from "next/link";
import { MessageSquare, CircleDollarSign, Calendar, MessageSquareMore } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatINR, initials } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";

export const metadata = { title: "Chat - CampusGig" };

export default async function ChatListPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // 1. Fetch chats where current user is poster or worker
  const { data: chats, error: chatsErr } = await supabase
    .from("chats")
    .select(`
      id,
      task_id,
      poster_id,
      worker_id,
      created_at,
      task:tasks(title, budget, status)
    `)
    .or(`poster_id.eq.${user.id},worker_id.eq.${user.id}`);

  let chatList: Array<{
    id: string;
    taskId: string;
    taskTitle: string;
    taskBudget: number;
    role: string;
    otherUser: {
      name: string;
      avatarUrl?: string;
      college: string;
    };
    latestMessage: string;
    timestamp: string;
  }> = [];

  if (chats && chats.length > 0) {
    const chatIds = chats.map((c) => c.id);
    const otherUserIds = chats.map((c) => (c.poster_id === user.id ? c.worker_id : c.poster_id));

    // 2. Fetch profiles of other participants
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, college")
      .in("user_id", otherUserIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

    // 3. Fetch latest messages for these chats
    const { data: messages } = await supabase
      .from("messages")
      .select("chat_id, content, created_at")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false });

    const latestMessageMap = new Map<string, { content: string; created_at: string }>();
    messages?.forEach((msg) => {
      if (!latestMessageMap.has(msg.chat_id)) {
        latestMessageMap.set(msg.chat_id, msg);
      }
    });

    chatList = chats
      .map((c) => {
        const otherId = c.poster_id === user.id ? c.worker_id : c.poster_id;
        const profile = profileMap.get(otherId);
        const latestMsg = latestMessageMap.get(c.id);

        // Type coercion
        const taskInfo = c.task as unknown as { title: string; budget: number; status: string } | null;

        return {
          id: c.id,
          taskId: c.task_id,
          taskTitle: taskInfo?.title || "Untitled Task",
          taskBudget: taskInfo?.budget || 0,
          role: c.poster_id === user.id ? "poster" : "worker",
          otherUser: {
            name: profile?.full_name || "Student",
            avatarUrl: profile?.avatar_url || undefined,
            college: profile?.college || "—",
          },
          latestMessage: latestMsg?.content || "No messages yet",
          timestamp: latestMsg?.created_at || c.created_at,
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <FadeIn>
        <div className="flex items-center gap-2">
          <MessageSquare className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Chat Rooms</h1>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">
          Communicate and coordinate details with task poster or worker.
        </p>
      </FadeIn>

      {chatList.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center text-muted-foreground">
          <div className="rounded-full bg-muted p-4">
            <MessageSquareMore className="size-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-semibold text-foreground">No active chats</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Chats will appear here automatically once you accept a proposal or your proposal is accepted.
          </p>
          <Button asChild variant="brand" className="mt-6">
            <Link href="/tasks">Browse marketplace</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {chatList.map((chat) => (
            <Link key={chat.id} href={`/chat/${chat.taskId}`}>
              <Card className="flex items-center justify-between p-4 transition-all hover:bg-muted/40 hover:shadow-soft group cursor-pointer">
                <div className="flex items-center gap-4 min-w-0">
                  <Avatar className="h-11 w-11 shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={chat.otherUser.avatarUrl} alt={chat.otherUser.name} />
                    <AvatarFallback>{initials(chat.otherUser.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {chat.otherUser.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {chat.otherUser.college}
                      </span>
                      <Badge variant="secondary" className="capitalize text-[10px] py-0 px-1.5">
                        {chat.role}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-foreground/80 truncate max-w-[280px] sm:max-w-md">
                      {chat.taskTitle}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[280px] sm:max-w-md">
                      {chat.latestMessage}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {new Date(chat.timestamp).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-xs font-bold text-accent tabular-nums">
                    {formatINR(chat.taskBudget)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
