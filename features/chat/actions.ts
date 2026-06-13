"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SendMessageResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

/** Sends a message to a chat room. */
export async function sendMessage(
  chatId: string,
  content: string
): Promise<SendMessageResult> {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Message content cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be signed in to send a message." };
  }

  // Validate chat exists and user is a participant
  const { data: chat, error: chatErr } = await supabase
    .from("chats")
    .select("id, task_id, poster_id, worker_id")
    .eq("id", chatId)
    .single();

  if (chatErr || !chat) {
    return { ok: false, error: "Chat room not found." };
  }

  if (chat.poster_id !== user.id && chat.worker_id !== user.id) {
    return { ok: false, error: "You are not a participant in this chat." };
  }

  // Insert the message
  const { data: message, error: insertErr } = await supabase
    .from("messages")
    .insert({
      chat_id: chatId,
      sender_id: user.id,
      content: trimmed,
    })
    .select("id")
    .single();

  if (insertErr || !message) {
    return { ok: false, error: insertErr?.message ?? "Could not send message." };
  }

  revalidatePath(`/chat/${chat.task_id}`);
  return { ok: true, messageId: message.id };
}

/** Marks all incoming messages in a chat as read. */
export async function markMessagesAsRead(chatId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false };

  // Update messages in the chat sent by the other user
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error("Failed to mark messages as read: ", error);
    return { ok: false };
  }

  return { ok: true };
}
