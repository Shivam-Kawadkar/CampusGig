"use client";

import * as React from "react";
import { Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";
import { sendMessage, markMessagesAsRead } from "../actions";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
  initialMessages: Message[];
  otherUser: {
    name: string;
    avatarUrl?: string;
    college: string;
  };
}

export function ChatWindow({
  chatId,
  currentUserId,
  initialMessages,
  otherUser,
}: ChatWindowProps) {
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const supabase = React.useMemo(() => createClient(), []);

  // Scroll to bottom helper
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    chatEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Scroll to bottom on initial render
  React.useEffect(() => {
    scrollToBottom("auto");
    markMessagesAsRead(chatId);
  }, [scrollToBottom, chatId]);

  // Subscribe to real-time message changes
  React.useEffect(() => {
    const channel = supabase
      .channel(`chat_${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Avoid duplicates (e.g. if optimistic update matched)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          // If message is from other participant, mark as read
          if (newMsg.sender_id !== currentUserId) {
            markMessagesAsRead(chatId);
          }
          
          setTimeout(() => scrollToBottom(), 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUserId, supabase, scrollToBottom]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setInput("");
    setSending(true);

    const result = await sendMessage(chatId, content);
    if (!result.ok) {
      // Restore input on failure
      setInput(content);
    }
    setSending(false);
    scrollToBottom();
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col rounded-xl border bg-card shadow-soft overflow-hidden">
      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet. Say hello to start coordinating!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <Avatar className="h-7 w-7 mb-1 shrink-0">
                    <AvatarImage src={otherUser.avatarUrl} alt={otherUser.name} />
                    <AvatarFallback>{initials(otherUser.name)}</AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`flex flex-col max-w-[70%] space-y-1 ${isMe ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-foreground rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                  
                  <span className="text-[9px] text-muted-foreground tabular-nums px-1">
                    {new Date(msg.created_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSend} className="border-t p-3 bg-muted/20 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${otherUser.name.split(" ")[0]}...`}
          className="flex-1 rounded-lg focus-visible:ring-ring/30"
          autoFocus
        />
        <Button type="submit" size="icon" variant="brand" disabled={!input.trim() || sending}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
