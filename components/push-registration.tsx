"use client";

import * as React from "react";
import { BellRing, Smartphone } from "lucide-react";

import {
  disablePushSubscriptionAction,
  getPushConfigAction,
  savePushSubscriptionAction,
} from "@/app/notifications/push-actions";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export function PushRegistration() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [state, setState] = React.useState<
    "unsupported" | "disabled" | "enabled"
  >("disabled");

  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setState("unsupported");
      return;
    }

    const check = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setState(subscription ? "enabled" : "disabled");
    };

    void check();
  }, []);

  async function handleEnablePush() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      setIsLoading(true);

      const permission = await window.Notification.requestPermission();
      if (permission !== "granted") {
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const { publicVapidKey } = await getPushConfigAction();

      if (!publicVapidKey) {
        throw new Error("Missing VAPID key configuration.");
      }

      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        }));

      await savePushSubscriptionAction(
        JSON.parse(JSON.stringify(subscription)) as {
          endpoint: string;
          keys?: { p256dh?: string; auth?: string };
        },
      );

      setState("enabled");
    } catch (error) {
      console.error(error);
      setState("disabled");
      alert(
        error instanceof Error
          ? error.message
          : "Could not enable push notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisablePush() {
    if (typeof window === "undefined") {
      return;
    }

    try {
      setIsLoading(true);
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await disablePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }

      setState("disabled");
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Could not disable push notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (state === "unsupported") {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Este dispositivo não suporta push web.
      </p>
    );
  }

  return (
    <div className="mt-3">
      {state === "enabled" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleDisablePush()}
          disabled={isLoading}
          className="w-full"
        >
          <Smartphone className="mr-2 h-4 w-4" />
          {isLoading ? "Atualizando..." : "Desativar push no celular"}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleEnablePush()}
          disabled={isLoading}
          className="w-full"
        >
          <BellRing className="mr-2 h-4 w-4" />
          {isLoading ? "Ativando..." : "Ativar push no celular"}
        </Button>
      )}
    </div>
  );
}
