"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, CheckCircle2, MessageSquare, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { markAllNotificationsAsRead } from "../actions";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  payload: any;
  is_read: boolean;
  created_at: string;
}

interface NotificationsListProps {
  notifications: NotificationItem[];
}

export function NotificationsList({ notifications: initialNotifications }: NotificationsListProps) {
  const router = useRouter();
  const [marking, setMarking] = React.useState(false);

  async function handleMarkAllAsRead() {
    setMarking(true);
    const res = await markAllNotificationsAsRead();
    if (res.ok) {
      toast.success("All notifications marked as read");
      router.refresh();
    } else {
      toast.error("Failed to update notifications");
    }
    setMarking(false);
  }

  const unreadCount = initialNotifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {unreadCount === 0 ? "No unread notifications" : `${unreadCount} unread`}
        </h2>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={marking}
          >
            {marking && <Loader2 className="size-3.5 animate-spin mr-2" />}
            Mark all as read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {initialNotifications.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground border-dashed bg-card">
            You have no notifications yet.
          </Card>
        ) : (
          initialNotifications.map((notif) => {
            const Icon = getIcon(notif.type);
            return (
              <Card
                key={notif.id}
                className={`p-4 transition-all hover:shadow-soft flex items-start gap-4 border ${
                  notif.is_read ? "bg-card opacity-80" : "bg-primary/5 border-primary/20"
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  notif.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                }`}>
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm leading-snug">{notif.title}</h4>
                    {!notif.is_read && (
                      <span className="size-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  {notif.body && (
                    <p className="text-xs text-foreground/80 leading-relaxed">{notif.body}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(notif.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {notif.payload?.task_id && (
                      <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs font-semibold">
                        <Link href={`/tasks/${notif.payload.task_id}`}>
                          View Task <ArrowRight className="size-3 ml-1 inline" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function getIcon(type: string) {
  switch (type) {
    case "proposal_accepted":
    case "proposal_accepted_poster":
      return CheckCircle2;
    case "message":
      return MessageSquare;
    case "proposal_rejected":
      return AlertTriangle;
    default:
      return Bell;
  }
}
