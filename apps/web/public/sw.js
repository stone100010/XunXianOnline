// 寻仙 Service Worker：离线外壳缓存（docs/08 断线恢复 + PWA）
const CACHE = "xunxian-shell-v1";
const SHELL = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // API 不缓存（服务端权威）；静态资源 stale-while-revalidate
  if (url.pathname.startsWith("/api/")) return;
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fresh = fetch(e.request)
        .then((res) => {
          if (res.ok && url.origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached ?? caches.match("/"));
      return cached ?? fresh;
    }),
  );
});

// Web Push：天命之召/保鲜期提醒（docs/10 二期项）
self.addEventListener("push", (e) => {
  let data = { title: "寻仙", body: "天玄大陆有事发生……" };
  try { data = e.data.json(); } catch { /* 兼容纯文本 */ }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body, icon: "/icon.svg", badge: "/icon.svg", tag: data.tag ?? "xunxian",
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow("/"));
});
