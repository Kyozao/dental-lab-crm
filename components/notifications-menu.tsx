"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

import { markAllNotificationsReadAction, markNotificationReadAction } from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type NotificationMenuItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  caseId: string | null;
};

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsMenu({
  notifications,
}: {
  notifications: NotificationMenuItem[];
}) {
  const router = useRouter();
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleMarkOneRead(notificationId: string, isRead: boolean) {
    if (isRead) {
      return;
    }

    try {
      setIsSubmitting(true);
      await markNotificationReadAction(notificationId);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      setIsSubmitting(true);
      await markAllNotificationsReadAction();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 p-0">
        <PopoverHeader className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <PopoverTitle>Notificações</PopoverTitle>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} pendente(s)`
                  : "Tudo em dia"}
              </p>
            </div>

            {notifications.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={isSubmitting || unreadCount === 0}
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Ler tudo
              </Button>
            ) : null}
          </div>
        </PopoverHeader>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Nenhuma notificação ainda.
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.caseId ? "/kanban" : "#"}
                  onClick={() => handleMarkOneRead(notification.id, notification.isRead)}
                  className={cn(
                    "block p-4 transition-colors hover:bg-accent/40",
                    !notification.isRead && "bg-blue-50/60 dark:bg-blue-950/20",
                  )}
                >
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <p className="font-medium text-sm">{notification.title}</p>
                    {!notification.isRead ? (
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatNotificationDate(notification.createdAt)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
