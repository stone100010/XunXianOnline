"use client";

import { useEffect, useState } from "react";

interface Stats {
  storage: string;
  totals: { archives: number; activeArchives: number; endedArchives: number; turns: number; devices: number };
  llm: { calls: number; degraded: number; byProvider: { provider: string; calls: number }[] };
  recent: { turnNo: number; actionKind: string; degraded: boolean; narrativeHead: string }[];
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  async function load() {
    const res = await fetch("/api/admin/stats");
    if (res.status === 401) { setAuthed(false); return; }
    setStats(await res.json());
    setAuthed(true);
  }
  useEffect(() => { void load(); }, []);

  async function login() {
    setErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) { setErr("密码错误"); return; }
    void load();
  }

  if (!authed) {
    return (
      <main>
        <h1 style={{ marginTop: 60, textAlign: "center", color: "var(--gold)", fontSize: 20 }}>⚜️ 寻仙 · 管理后台</h1>
        <div className="card">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="管理员密码（默认 xunxian-admin，env ADMIN_PASSWORD）"
            style={{ width: "100%", background: "#0000", border: "1px solid var(--gold-dim)", borderRadius: 6, padding: 10, color: "var(--ink)" }} />
          <button onClick={login} style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 6, border: 0, background: "var(--gold)", color: "#111", fontWeight: 600 }}>
            登录
          </button>
          {err && <p style={{ color: "var(--cinnabar)", fontSize: 12, marginTop: 8 }}>{err}</p>}
        </div>
      </main>
    );
  }

  const t = stats?.totals;
  const llm = stats?.llm;
  const degradedRate = llm && llm.calls > 0 ? Math.round((llm.degraded / llm.calls) * 100) : 0;

  return (
    <main style={{ paddingBottom: 40 }}>
      <h1 style={{ marginTop: 24, textAlign: "center", color: "var(--gold)", fontSize: 18 }}>⚜️ 运营看板（{stats?.storage === "postgres" ? "PostgreSQL" : "内存存储"}）</h1>

      <div className="card">
        <h2 style={{ color: "var(--gold)", fontSize: 15 }}>📊 总览</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8, fontSize: 14 }}>
          <div>存档总数：<b>{t?.archives ?? "-"}</b></div>
          <div>进行中：<b>{t?.activeArchives ?? "-"}</b></div>
          <div>已终章/转世：<b>{t?.endedArchives ?? "-"}</b></div>
          <div>累计回合：<b>{t?.turns ?? "-"}</b></div>
          <div>设备数：<b>{t?.devices ?? "-"}</b></div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ color: "var(--gold)", fontSize: 15 }}>🤖 LLM 成本与质量</h2>
        <div style={{ marginTop: 8, fontSize: 14 }}>
          <div>叙事调用：<b>{llm?.calls ?? "-"}</b> ｜ 降级：<b style={{ color: degradedRate > 5 ? "var(--cinnabar)" : "var(--jade)" }}>{llm?.degraded ?? 0}（{degradedRate}%）</b></div>
          {llm?.byProvider.map((p) => (
            <div key={p.provider} style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
              · {p.provider}：{p.calls} 次
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ color: "var(--gold)", fontSize: 15 }}>🕰️ 最近回合</h2>
        {stats?.recent.map((r, i) => (
          <div key={i} style={{ marginTop: 8, fontSize: 12, borderBottom: "1px solid #ffffff12", paddingBottom: 6 }}>
            <span style={{ color: "var(--gold)" }}>#{r.turnNo} · {r.actionKind}</span>
            {r.degraded && <span style={{ color: "var(--cinnabar)" }}>（降级）</span>}
            <div style={{ color: "var(--ink-dim)", marginTop: 2 }}>{r.narrativeHead}…</div>
          </div>
        ))}
      </div>
    </main>
  );
}
