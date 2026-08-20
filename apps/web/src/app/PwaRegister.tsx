"use client";

import { useEffect } from "react";

/** PWA：Service Worker 注册 + Web Push 订阅（docs/10 二期项落地） */
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* 静默失败：离线能力降级 */ });

    // Web Push 订阅（浏览器支持且用户已安装 PWA 时静默订阅；v1 无打扰策略）
    if (!("PushManager" in window) || Notification.permission !== "granted") return;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        const sub = existing ?? await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: (await (await fetch("/api/push/key")).json()).publicKey,
        });
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(sub.toJSON()),
        });
      } catch { /* 订阅失败不影响游戏 */ }
    })();
  }, []);
  return null;
}
