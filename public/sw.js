self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {
    title: "Nova notificação",
    body: "Você recebeu uma atualização.",
    url: "/kanban",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed,
      };
    } catch {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: "/next.svg",
    badge: "/next.svg",
    data: {
      url: payload.url || "/kanban",
    },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const destination = event.notification.data?.url || "/kanban";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(destination);
            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(destination);
        }
      }),
  );
});
