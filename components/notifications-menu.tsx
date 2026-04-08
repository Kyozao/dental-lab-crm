"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, BellRing, CheckCheck } from "lucide-react";

import {
  getLatestNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

function normalizeNotification(
  value: Record<string, unknown>,
): NotificationMenuItem | null {
  const id = typeof value.id === "string" ? value.id : null;
  const title = typeof value.title === "string" ? value.title : null;
  const message = typeof value.message === "string" ? value.message : null;

  if (!id || !title || !message) {
    return null;
  }

  const createdAtValue = value.createdAt;

  return {
    id,
    title,
    message,
    createdAt:
      typeof createdAtValue === "string"
        ? createdAtValue
        : new Date().toISOString(),
    isRead: Boolean(value.isRead),
    caseId: typeof value.caseId === "string" ? value.caseId : null,
  };
}

export function NotificationsMenu({
  notifications,
  currentUserId,
}: {
  notifications: NotificationMenuItem[];
  currentUserId?: string;
}) {
  const [items, setItems] = React.useState(notifications);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [browserPermission, setBrowserPermission] = React.useState<
    NotificationPermission | "unsupported"
  >("default");
  const knownIdsRef = React.useRef(new Set(notifications.map((item) => item.id)));

  React.useEffect(() => {
    setItems(notifications);
    knownIdsRef.current = new Set(notifications.map((item) => item.id));
  }, [notifications]);

  React.useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setBrowserPermission("unsupported");
      return;
    }

    setBrowserPermission(window.Notification.permission);
  }, []);

  const showBrowserAlert = React.useCallback((notification: NotificationMenuItem) => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (window.Notification.permission !== "granted") {
      return;
    }

    const alert = new window.Notification(notification.title, {
      body: notification.message,
      tag: notification.id,
    });

    alert.onclick = () => {
      window.focus();
      alert.close();
    };

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([120, 60, 120]);
    }
  }, []);

  const announceNotification = React.useCallback(
    (notification: NotificationMenuItem) => {
      toast(notification.title, {
        description: notification.message,
      });
      showBrowserAlert(notification);
    },
    [showBrowserAlert],
  );

  React.useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let isMounted = true;

    const refreshNotifications = async () => {
      try {
        const latest = await getLatestNotificationsAction();

        if (!isMounted) {
          return;
        }

        for (const notification of latest) {
          if (!knownIdsRef.current.has(notification.id) && !notification.isRead) {
            knownIdsRef.current.add(notification.id);
            announceNotification(notification);
          }
        }

        knownIdsRef.current = new Set(latest.map((item) => item.id));
        setItems(latest);
      } catch (error) {
        console.error(error);
      }
    };

    void refreshNotifications();

    const pollId = window.setInterval(() => {
      void refreshNotifications();
    }, 8000);

    const handleVisibilityOrFocus = () => {
      void refreshNotifications();
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Notification",
          filter: `recipientUserId=eq.${currentUserId}`,
        },
        (payload) => {
          const nextItem = normalizeNotification(
            payload.new as Record<string, unknown>,
          );

          if (!nextItem) {
            return;
          }

          if (!knownIdsRef.current.has(nextItem.id)) {
            knownIdsRef.current.add(nextItem.id);
            announceNotification(nextItem);
          }

          setItems((previous) =>
            [nextItem, ...previous.filter((item) => item.id !== nextItem.id)].slice(
              0,
              12,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Notification",
          filter: `recipientUserId=eq.${currentUserId}`,
        },
        (payload) => {
          const nextItem = normalizeNotification(
            payload.new as Record<string, unknown>,
          );

          if (!nextItem) {
            return;
          }

          setItems((previous) =>
            previous.map((item) =>
              item.id === nextItem.id ? { ...item, ...nextItem } : item,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      window.clearInterval(pollId);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      void supabase.removeChannel(channel);
    };
  }, [announceNotification, currentUserId]);

  const unreadCount = items.filter((item) => !item.isRead).length;

  async function handleEnableBrowserAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const permission = await window.Notification.requestPermission();
    setBrowserPermission(permission);

    if (permission === "granted") {
      const alert = new window.Notification("Alertas ativados", {
        body: "Você vai receber notificações em tempo real no navegador.",
      });

      window.setTimeout(() => alert.close(), 2500);
    }
  }

  async function handleMarkOneRead(notificationId: string, isRead: boolean) {
    if (isRead) {
      return;
    }

    const previous = items;

    try {
      setIsSubmitting(true);
      setItems((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, isRead: true } : item,
        ),
      );
      await markNotificationReadAction(notificationId);
    } catch (error) {
      console.error(error);
      setItems(previous);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMarkAllRead() {
    const previous = items;

    try {
      setIsSubmitting(true);
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      await markAllNotificationsReadAction();
    } catch (error) {
      console.error(error);
      setItems(previous);
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
                {unreadCount > 0 ? `${unreadCount} pendente(s)` : "Tudo em dia"}
              </p>
            </div>

            {items.length > 0 ? (
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

          {browserPermission === "default" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEnableBrowserAlerts}
              className="mt-3 w-full"
            >
              <BellRing className="mr-2 h-4 w-4" />
              Ativar alertas no navegador
            </Button>
          ) : null}

          {browserPermission === "denied" ? (
            <p className="mt-3 text-xs text-amber-600">
              Os alertas do navegador estão bloqueados. Ative nas permissões do browser para receber aviso no celular/computador.
            </p>
          ) : null}
        </PopoverHeader>

        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              Nenhuma notificação ainda.
            </div>
          ) : (
            <div className="divide-y">
              {items.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.caseId ? "/kanban" : "#"}
                  onClick={() =>
                    void handleMarkOneRead(notification.id, notification.isRead)
                  }
                  className={cn(
                    "block p-4 transition-colors hover:bg-accent/40",
                    !notification.isRead && "bg-blue-50/60 dark:bg-blue-950/20",
                  )}
                >
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{notification.title}</p>
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
