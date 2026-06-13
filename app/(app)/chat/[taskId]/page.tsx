import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageCircleCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/user";
import { getTask } from "@/features/tasks/repository";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/features/chat/components/chat-window";
import { initials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatPageProps {
  params: Promise<{ taskId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { taskId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // 1. Fetch chat metadata and task context
  const { data: chat, error: chatErr } = await supabase
    .from("chats")
    .select(`
      id,
      task_id,
      poster_id,
      worker_id,
      task:tasks(title, budget, status)
    `)
    .eq("task_id", taskId)
    .maybeSingle();

  if (chatErr || !chat) {
    notFound();
  }

  // Verify authorization
  const isPoster = chat.poster_id === user.id;
  const isWorker = chat.worker_id === user.id;
  if (!isPoster && !isWorker) {
    redirect("/chat");
  }

  // 2. Fetch the other participant's profile
  const otherUserId = isPoster ? chat.worker_id : chat.poster_id;
  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("user_id, full_name, avatar_url, college")
    .eq("user_id", otherUserId)
    .single();

  const otherUser = {
    name: otherProfile?.full_name || "Student",
    avatarUrl: otherProfile?.avatar_url || undefined,
    college: otherProfile?.college || "—",
  };

  // 3. Fetch messages log
  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, content, created_at, read_at")
    .eq("chat_id", chat.id)
    .order("created_at", { ascending: true });

  const taskInfo = chat.task as unknown as { title: string; budget: number; status: string } | null;

  return (
    <div className="space-y-4 max-w-4xl mx-auto py-2">
      {/* Back & header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link href="/chat">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="font-bold text-base md:text-lg text-foreground truncate max-w-sm sm:max-w-md">
              {taskInfo?.title || "Chat Room"}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Chatting with {otherUser.name} · {otherUser.college}
            </p>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="sm:ml-auto">
          <Link href={`/tasks/${taskId}`}>
            View Task Details
          </Link>
        </Button>
      </div>

      {/* Mounting Chat Window */}
      <ChatWindow
        chatId={chat.id}
        currentUserId={user.id}
        initialMessages={messages || []}
        otherUser={otherUser}
      />
    </div>
  );
}
