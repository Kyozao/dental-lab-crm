"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export type NotificationMenuItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  caseId: string | null;
};

export function NotificationsMenu({
  notifications = [],
}: {
  notifications?: NotificationMenuItem[];
  currentUserId?: string;
}) {
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <PopoverHeader className="border-b p-4">
          <PopoverTitle>Notificações</PopoverTitle>
          <p className="text-xs text-muted-foreground">
            Temporariamente desativadas enquanto redesenhamos a API.
          </p>
        </PopoverHeader>

        <div className="space-y-3 p-4 text-sm">
          <p className="text-muted-foreground">
            O fluxo anterior de tempo real, push e permissões do navegador foi
            removido por enquanto.
          </p>
          <div className="rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
            Próxima versão: API própria de notificações, regras de entrega
            claras e validação ponta a ponta.
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
