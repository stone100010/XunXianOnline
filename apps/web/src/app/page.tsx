"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { START_PACKS } from "@xunxian/content";

interface ArchiveRow {
  id: string;
  slot: number;
  daoFruitCode: string;
  status: string;
  state: { name: string; cultivation: { level: number }; gameYear: number; gameMonth: number } | null;
}

export default function Home() {
  const router = useRouter();
  const [archives, setArchives] = useState<ArchiveRow[]>([]);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    const res = await fetch("/api/archives");
    const json = await res.json();
    setArchives(json.archives ?? []);
  }
  useEffect(() => { void load(); }, []);

  async function restore() {
    setMsg("");
    const res = await fetch("/api/archives", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    if (!res.ok) { setMsg(json.error?.message ?? "恢复失败"); return; }
    void load();
    setMsg(`✅ 已恢复仙途：${json.archive.daoFruitCode}`);
  }

  return (
    <main style={{ paddingBottom: 32 }}>
      <h1 style={{ marginTop: 40, textAlign: "center", color: "var(--gold)", fontSize: 22 }}>
        ✨⋆｡°✩ ༺ 寻 仙 · 天 命 待 择 ༻ ✩°｡⋆✨
      </h1>
      <p style={{ marginTop: 8, textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>
        单人月令回合制 · 开放世界修仙模拟器
      </p>

      <div className="card">
        <h2 style={{ color: "var(--gold)", fontSize: 16 }}>📜 我的仙途（{archives.length}/3 槽）</h2>
        {archives.length === 0 && (
          <p style={{ color: "var(--ink-dim)", fontSize: 13, marginTop: 8 }}>尚无存档，选择下方开局踏上仙途。</p>
        )}
        {archives.map((a) => (
          <div key={a.id} className="card" style={{ cursor: "pointer", margin: "10px 0 0" }}
               onClick={() => router.push(`/game?archive=${a.id}`)}>
            <div style={{ fontSize: 15 }}>
              槽{a.slot} · <b>{a.state?.name ?? "无名修士"}</b>
              {a.state && <span style={{ color: "var(--ink-dim)" }}> ｜ Lv.{a.state.cultivation.level} · 第{a.state.gameYear}年{a.state.gameMonth}月</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
              📦 道果码：{a.daoFruitCode.slice(0, 4)}-{a.daoFruitCode.slice(4)}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 style={{ color: "var(--gold)", fontSize: 16 }}>🔄 道果码恢复</h2>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX"
            style={{ flex: 1, background: "#0000", border: "1px solid var(--gold-dim)", borderRadius: 6, padding: "8px 10px", color: "var(--ink)" }}
          />
          <button onClick={restore} style={{ background: "var(--gold)", color: "#111", border: 0, borderRadius: 6, padding: "8px 14px", fontWeight: 600 }}>
            恢复
          </button>
        </div>
        {msg && <p style={{ fontSize: 12, marginTop: 8, color: "var(--jade)" }}>{msg}</p>}
      </div>

      {showCreate ? (
        <CreateWizard onDone={(id) => router.push(`/game?archive=${id}`)} />
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          disabled={archives.length >= 3}
          style={{ width: "100%", marginTop: 16, padding: 14, borderRadius: 8, border: "1px solid var(--gold)", background: "#c8a24b22", color: "var(--gold)", fontSize: 16, fontWeight: 600 }}
        >
          ⚜️ 开辟新仙途（{archives.length >= 3 ? "存档已满" : "十大天命开局"}）
        </button>
      )}
    </main>
  );
}

function CreateWizard({ onDone }: { onDone: (archiveId: string) => void }) {
  const [slot, setSlot] = useState(1);
  const [packKey, setPackKey] = useState(START_PACKS[0]?.key ?? "");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/archives", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slot, packKey,
        name: "林寻", gender: "male", race: "human", age: 18,
        domain: "zhongzhou", daoRhymeKey: "mingcha",
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (res.ok) onDone(json.archive.id);
    else alert(json.error?.message ?? "创建失败");
  }

  return (
    <div className="card">
      <h2 style={{ color: "var(--gold)", fontSize: 16 }}>⚜️ 选择天命开局</h2>
      {START_PACKS.map((p) => (
        <label key={p.key} className="card" style={{ display: "block", margin: "10px 0 0", cursor: "pointer", borderColor: packKey === p.key ? "var(--gold)" : "var(--gold-dim)" }}>
          <input type="radio" checked={packKey === p.key} onChange={() => setPackKey(p.key)} style={{ marginRight: 8 }} />
          <b>{p.name}</b>
          <span style={{ color: "var(--ink-dim)", fontSize: 12 }}> ｜【天命·{p.destinyName}】{p.destinySummary}</span>
          <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
            资产：{p.assets} ｜ 灵石 {p.initialCurrencies.low} ｜ 初始 Lv.{p.initialRealmLevel} ｜ {p.social}
          </div>
        </label>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <select value={slot} onChange={(e) => setSlot(Number(e.target.value))} style={{ background: "#0000", border: "1px solid var(--gold-dim)", borderRadius: 6, padding: "8px", color: "var(--ink)" }}>
          <option value={1}>槽位 1</option>
          <option value={2}>槽位 2</option>
          <option value={3}>槽位 3</option>
        </select>
        <button onClick={create} disabled={busy} style={{ flex: 1, background: "var(--gold)", color: "#111", border: 0, borderRadius: 6, padding: 12, fontWeight: 600 }}>
          {busy ? "开辟中…" : "✨ 踏上仙途"}
        </button>
      </div>
      <p style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 8 }}>
        * v0 建角向导：姓名/种族/灵根等默认配置，完整 7 步向导迭代中
      </p>
    </div>
  );
}
