"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CombatResult, PlayerState } from "@xunxian/shared";

interface CompassOpt {
  idx: number; kind: string; label: string;
  riskFlag?: boolean; destinyFlag?: boolean; freshnessMonths: number;
}
interface TurnView {
  state: PlayerState; realmName: string; compass: CompassOpt[];
}
interface Settlement {
  turnNo: number; narrative: string; degraded: boolean;
  delta: { cultivationGain: number; levelsGained: number; realmName: string; combat?: CombatResult };
  state: PlayerState;
}

const KIND_LABEL: Record<string, string> = {
  mingtu: "🌌 命途推进", yinyuan: "🪷 因缘际会", lishi: "🗺️ 历练探索",
  daoyuan: "👥 道缘经营", baiyi: "⚒️ 修仙百艺", biguan: "🧘 闭关修持",
};

export default function GamePage() {
  return (
    <Suspense fallback={<main><p style={{ marginTop: 40, textAlign: "center" }}>推演天机中…</p></main>}>
      <GameInner />
    </Suspense>
  );
}

function GameInner() {
  const router = useRouter();
  const params = useSearchParams();
  const archiveId = params.get("archive") ?? "";
  const [view, setView] = useState<TurnView | null>(null);
  const [settle, setSettle] = useState<Settlement | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    if (!archiveId) return;
    const res = await fetch(`/api/archives/${archiveId}/turn`);
    if (!res.ok) { setErr("读取仙途失败，请从首页重新进入"); return; }
    setView(await res.json());
    setSettle(null);
  }, [archiveId]);

  useEffect(() => { void load(); }, [load]);
  if (!archiveId) return <main><p style={{ marginTop: 40, textAlign: "center" }}>缺少存档参数</p></main>;

  async function act(optionIdx: number) {
    if (busy || settle) return;
    setBusy(true); setErr("");
    const res = await fetch(`/api/archives/${archiveId}/turn/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ turnNo: view!.state.turnNo, optionIdx }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(json.error?.message ?? "结算失败"); return; }
    setSettle(json);
  }

  async function next() {
    if (busy || !settle) return;
    setBusy(true);
    const res = await fetch(`/api/archives/${archiveId}/turn/next`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ turnNo: settle.turnNo }),
    });
    setBusy(false);
    if (!res.ok) { const j = await res.json(); setErr(j.error?.message ?? "推进失败"); return; }
    void load();
  }

  if (!view) return <main><p style={{ marginTop: 40, textAlign: "center" }}>{err || "推演天机中…"}</p></main>;
  const s = view.state;

  return (
    <main style={{ paddingBottom: 90 }}>
      {/* 状态总览 */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ textAlign: "center", color: "var(--gold)", fontSize: 14 }}>
          ✨⋆｡°✩ ༺ 本 月 修 仙 状 态 ༻ ✩°｡⋆✨
        </div>
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--ink-dim)", marginTop: 6 }}>
          🌙 天玄历·{s.gameYear}年{s.gameMonth}月 ｜ 🎂 骨龄：{s.age}岁 ｜ ⏳ 寿元余：{s.cultivation.lifespanYears}年
        </div>
        <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.9 }}>
          <div>🧬 修为：{view.realmName}（Lv.{s.cultivation.level}）｜ 经验 {s.cultivation.exp}</div>
          <div>📊 道基：悟{s.daoBases.wuxin.level} / 心{s.daoBases.daoxin.level} / 根{s.daoBases.genku.level} / 运{s.daoBases.qiyun.level} / 血{s.daoBases.xuema.level}</div>
          <div>🌟 灵根：{s.spiritRoot.grade}（{s.spiritRoot.elements.join("·")}）</div>
          <div>💎 灵石：下品 {s.currencies.low}</div>
        </div>
      </div>

      {/* 结算面板 或 决策罗盘 */}
      {settle ? (
        <div className="card">
          <div style={{ textAlign: "center", color: "var(--gold)" }}>📜【 月 末 结 算 】📜</div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.9, marginTop: 10 }}>
            {settle.narrative}
          </div>
          {settle.delta.levelsGained > 0 && (
            <div style={{ color: "var(--jade)", marginTop: 8 }}>✨ 连破 {settle.delta.levelsGained} 层！</div>
          )}
          <button onClick={next} disabled={busy}
            style={{ width: "100%", marginTop: 14, padding: 14, borderRadius: 8, border: 0, background: "var(--gold)", color: "#111", fontSize: 16, fontWeight: 600 }}>
            {busy ? "演化世界中…" : "🌙 进入下月"}
          </button>
        </div>
      ) : (
        <div className="card">
          <div style={{ textAlign: "center", color: "var(--gold)" }}>✍️【 决策罗盘 】</div>
          <p style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
            每月一决。选择一项，或等待机缘自行流转（保鲜期 1-4 月）。
          </p>
          {view.compass.map((o) => (
            <button key={o.idx} onClick={() => act(o.idx)} disabled={busy}
              style={{ display: "block", width: "100%", textAlign: "left", marginTop: 8, padding: "10px 12px", borderRadius: 8,
                border: o.destinyFlag ? "1px solid var(--gold)" : "1px solid var(--gold-dim)",
                background: o.destinyFlag ? "#c8a24b18" : "#0000", color: "var(--ink)", fontSize: 14, lineHeight: 1.6 }}>
              <span style={{ color: "var(--ink-dim)", fontSize: 11 }}>{KIND_LABEL[o.kind] ?? o.kind}</span>
              <div>{o.idx}. {o.label}{o.riskFlag ? " ⚠️" : ""}{o.destinyFlag ? " 🌌" : ""}</div>
            </button>
          ))}
        </div>
      )}

      {err && <p style={{ color: "var(--cinnabar)", fontSize: 12, marginTop: 8, textAlign: "center" }}>{err}</p>}

      <button onClick={() => router.push("/")}
        style={{ marginTop: 16, width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--gold-dim)", background: "#0000", color: "var(--ink-dim)" }}>
        ⬅ 返回存档列表
      </button>
    </main>
  );
}
