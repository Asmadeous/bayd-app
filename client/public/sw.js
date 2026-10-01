// BAYD browser notifications (web push). The server sends { title, body, url };
// clicking opens that page, reusing an open BAYD tab when there is one.
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Beauty @ Your Door", {
      body: data.body || "",
      icon: "/icon.png",
      badge: "/icon.png",
      data: { url: data.url || "/" },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const sameSite = windows.find((w) => new URL(w.url).origin === self.location.origin)
      if (sameSite && new URL(target).origin === self.location.origin) {
        return sameSite.focus().then(() => sameSite.navigate(target))
      }
      return self.clients.openWindow(target)
    }),
  )
})
