"use client";

import { useEffect, useState } from "react";

interface Stats {
  storage: string;
  totals: { archives: number; activeArchives: number; endedArchives: number; turns: number; devices: number };
  llm: { calls: number; degraded: number; byProvider: { provider: string; calls: number }[] };
  recent: { turnNo: number; actionKind: string; degraded: boolean; narrativeHead: string }[];
}

function PushPanel() {
  const [info, setInfo] = useState<{ configured: boolean; count: number } | null>(null);
  const [title, setTitle] = useState("🌌 天命之召");
  const [body, setBody] = useState("新的一年已至，你的天命在等待抉择。");
  const [msg, setMsg] = useState("");
  async function load() { setInfo(await (await fetch("/api/admin/push")).json()); }
  useEffect(() => { void load(); }, []);
  async function send() {
    const res = await fetch("/api/admin/push", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const j = await res.json();
    setMsg(j.configured === false ? "⚠️ 未配置 VAPID 密钥（.env）" : `已发送 ${j.sent}，失败清理 ${j.failed}`);
    void load();
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
        状态：{info?.configured ? "✅ VAPID 已配置" : "⚠️ 未配置"} ｜ 订阅数：{info?.count ?? 0}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", marginTop: 8, background: "#0000", border: "1px solid var(--gold-dim)", borderRadius: 6, padding: 8, color: "var(--ink)" }} />
      <input value={body} onChange={(e) => setBody(e.target.value)} style={{ width: "100%", marginTop: 6, background: "#0000", border: "1px solid var(--gold-dim)", borderRadius: 6, padding: 8, color: "var(--ink)" }} />
      <button onClick={send} style={{ width: "100%", marginTop: 8, padding: 10, borderRadius: 6, border: 0, background: "var(--gold)", color: "#111", fontWeight: 600 }}>广播通知</button>
      {msg && <div style={{ fontSize: 12, color: "var(--jade)", marginTop: 6 }}>{msg}</div>}
    </div>
  );
}

interface RefItem { key: string; name: string; category: string; price: number; grade: number; desc: string; enabled: boolean }

function ItemsPanel() {
  const [items, setItems] = useState<RefItem[]>([]);
  const [msg, setMsg] = useState("");
  const [draft, setDraft] = useState({ key: "", name: "", category: "dan", price: 100, grade: 1, desc: "" });
  async function load() {
    const res = await fetch("/api/admin/refs/items");
    if (!res.ok) { setMsg("加载失败（需登录）"); return; }
    const j = await res.json();
    setItems(j.items);
    if (j.seeded > 0) setMsg(`已从引擎基线导入 ${j.seeded} 项`);
  }
  useEffect(() => { void load(); }, []);
  async function save() {
    const res = await fetch("/api/admin/refs/items", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...draft, price: Number(draft.price), grade: Number(draft.grade) }),
    });
    const j = await res.json();
    setMsg(res.ok ? `已保存 ${draft.key}（热更生效于下月货架）` : j.error?.message ?? "保存失败");
    if (res.ok) void load();
  }
  async function remove(key: string) {
    await fetch("/api/admin/refs/items", {
      method: "DELETE", headers: { "content-type": "application/json" },
      body: JSON.stringify({ key }),
    });
    void load();
  }
  async function toggle(it: RefItem) {
    await fetch("/api/admin/refs/items", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...it, desc: it.desc, enabled: !it.enabled }),
    });
    void load();
  }
  const inp: React.CSSProperties = { background: "#0000", border: "1px solid var(--gold-dim)", borderRadius: 6, padding: "6px 8px", color: "var(--ink)", fontSize: 13 };
  return (
    <div style={{ marginTop: 8 }}>
      {msg && <div style={{ fontSize: 12, color: "var(--jade)" }}>{msg}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
        <input placeholder="key（如 juqi_dan）" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} style={inp} />
        <input placeholder="名称" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={inp} />
        <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={inp}>
          {["dan", "qi", "fu", "zhen", "caiyao", "gongfa", "qingbao"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display: "flex", gap: 6 }}>
          <input type="number" placeholder="价格" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} style={inp} />
          <input type="number" placeholder="品级" value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: Number(e.target.value) })} style={inp} />
        </div>
      </div>
      <button onClick={save} style={{ width: "100%", marginTop: 6, padding: 8, borderRadius: 6, border: 0, background: "var(--gold)", color: "#111", fontWeight: 600, fontSize: 13 }}>新增 / 更新</button>
      <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 10 }}>
        {items.map((it) => (
          <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 0", borderBottom: "1px solid #ffffff12" }}>
            <span style={{ flex: 1 }}>{it.enabled ? "" : "🚫 "}{it.name} <span style={{ color: "var(--ink-dim)" }}>({it.key}·{it.category}·品{it.grade})</span></span>
            <span style={{ color: "var(--gold)" }}>{it.price}💎</span>
            <button onClick={() => void toggle(it)} style={{ ...inp, padding: "2px 6px" }}>{it.enabled ? "下架" : "启用"}</button>
            <button onClick={() => void remove(it.key)} style={{ ...inp, padding: "2px 6px", color: "var(--cinnabar)" }}>删</button>
          </div>
        ))}
      </div>
    </div>
  );
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
        <h2 style={{ color: "var(--gold)", fontSize: 15 }}>🔔 Web Push 广播</h2>
        <PushPanel />
      </div>

      <div className="card">
        <h2 style={{ color: "var(--gold)", fontSize: 15 }}>🧾 数值表 · 物品（ref_items）</h2>
        <ItemsPanel />
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
