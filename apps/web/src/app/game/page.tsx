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
  briefing?: { title: string; items: { text: string }[] }[];
  destiny?: { storylineKey: string; stage: number; phase: string; waitingYears: number; rewards: string[] };
}
interface Settlement {
  turnNo: number; narrative: string; degraded: boolean;
  delta: { cultivationGain: number; levelsGained: number; realmName: string; combat?: CombatResult; relation?: { npcName: string; intimacy: number; tier: number }; destiny?: { stageName: string; rewardNote: string; nextPhase: string } };
  state: PlayerState;
}

const DICE_FACES: Record<string, string> = {
  tianci: "⚡", hongyun: "🌟", jiyuan: "🍀", zhonggui: "⚖️",
  bozhe: "🌫️", shiyun: "💨", tianyi: "💀",
};

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
  const [tab, setTab] = useState<"month" | "market" | "bag" | "npc" | "history">("month");
  const [shelf, setShelf] = useState<{ tierName: string; items: { key: string; name: string; price: number; desc: string; grade: number }[]; discountRate: number } | null>(null);
  const [bag, setBag] = useState<{ key: string; name: string; qty: number; category: string }[] | null>(null);
  const [marketMsg, setMarketMsg] = useState("");

  async function openMarket(tier: string) {
    setMarketMsg("");
    const res = await fetch(`/api/archives/${archiveId}/market?tier=${tier}`);
    const json = await res.json();
    if (!res.ok) { setMarketMsg(json.error?.message ?? "无法进入"); setShelf(null); return; }
    setShelf(json.shelf);
  }
  const [npcList, setNpcList] = useState<{ name: string; profession: string; realmLevel: number; traits: string[]; goal: string; intimacy: number; tierName: string }[] | null>(null);
  const [history, setHistory] = useState<{ turnNo: number; actionKind: string; narrative: string }[] | null>(null);
  async function openHistory() {
    const res = await fetch(`/api/archives/${archiveId}/history`);
    const json = await res.json();
    setHistory(json.records ?? []);
  }
  async function openNpcs() {
    const res = await fetch(`/api/archives/${archiveId}/npcs`);
    const json = await res.json();
    setNpcList(json.relations ?? []);
  }
  async function openBag() {
    const res = await fetch(`/api/archives/${archiveId}/market?what=inventory`);
    const json = await res.json();
    setBag(json.items ?? []);
  }
  async function purchase(itemKey: string, haggle: boolean) {
    setMarketMsg("");
    const res = await fetch(`/api/archives/${archiveId}/market`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tier: "zhengshi", itemKey, bargain: haggle }),
    });
    const json = await res.json();
    if (!res.ok) { setMarketMsg(json.error?.message ?? "交易失败"); return; }
    setMarketMsg(json.message);
    void load(); // 刷新钱包
  }
  const [freeform, setFreeform] = useState("");

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

  async function actFreeform() {
    if (busy || settle || freeform.trim().length < 2) return;
    setBusy(true); setErr("");
    const res = await fetch(`/api/archives/${archiveId}/turn/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ turnNo: view!.state.turnNo, freeform: freeform.trim() }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(json.error?.message ?? "天道未能理解你的意图"); return; }
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
  const tabBtn: React.CSSProperties = {
    padding: "6px 10px", borderRadius: 6, border: "1px solid var(--gold-dim)",
    background: "#0000", color: "var(--ink)", fontSize: 13,
  };

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

      {/* 页签 */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {([["month", "🌙 本月"], ["market", "🏪 坊市"], ["bag", "🎒 背包"], ["npc", "👥 道缘"], ["history", "📜 仙史"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => { setTab(k); if (k === "bag") void openBag(); if (k === "market" && !shelf) void openMarket("zhengshi"); if (k === "npc") void openNpcs(); if (k === "history") void openHistory(); }}
            style={{ flex: 1, padding: 10, borderRadius: 8, border: tab === k ? "1px solid var(--gold)" : "1px solid var(--gold-dim)", background: tab === k ? "#c8a24b22" : "#0000", color: tab === k ? "var(--gold)" : "var(--ink-dim)", fontSize: 14 }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "market" && (
        <div className="card">
          <div style={{ textAlign: "center", color: "var(--gold)" }}>🏪【{shelf?.tierName ?? "坊市"}】</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => void openMarket("zhengshi")} style={tabBtn}>正市</button>
            <button onClick={() => void openMarket("heishi")} style={tabBtn}>黑市</button>
            <button onClick={() => void openMarket("miku")} style={tabBtn}>秘库</button>
          </div>
          {marketMsg && <p style={{ fontSize: 12, color: "var(--jade)", marginTop: 8 }}>{marketMsg}</p>}
          {shelf?.items.map((it) => (
            <div key={it.key} className="card" style={{ margin: "10px 0 0" }}>
              <div style={{ fontSize: 14 }}><b>{it.name}</b> ｜ 💎 {it.price} 灵石 ｜ 品级 {it.grade}</div>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>{it.desc}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => void purchase(it.key, false)} style={{ ...tabBtn, flex: 1 }}>直接购买</button>
                <button onClick={() => void purchase(it.key, true)} style={{ ...tabBtn, flex: 1 }}>🤝 议价</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "bag" && (
        <div className="card">
          <div style={{ textAlign: "center", color: "var(--gold)" }}>🎒【储物袋】</div>
          {bag && bag.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 8 }}>空空如也。</p>}
          {bag?.map((it) => (
            <div key={it.key} style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 14 }}>
              <span>{it.name}</span>
              <span style={{ color: "var(--ink-dim)" }}>×{it.qty}｜{it.category}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "npc" && (
        <div className="card">
          <div style={{ textAlign: "center", color: "var(--gold)" }}>👥【道缘网络】</div>
          {npcList && npcList.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 8 }}>尚未结识任何人。</p>}
          {npcList?.map((n) => (
            <div key={n.name} className="card" style={{ margin: "10px 0 0" }}>
              <div style={{ fontSize: 14 }}><b>{n.name}</b> ｜ {n.profession} ｜ Lv.{n.realmLevel}</div>
              <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 4 }}>
                性格：{n.traits.join("·")} ｜ 志向：{n.goal}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 13 }}>
                <span>🤝 {n.tierName}</span>
                <span style={{ color: "var(--gold)" }}>好感 {n.intimacy}</span>
              </div>
              <div style={{ height: 6, background: "#ffffff12", borderRadius: 3, marginTop: 4 }}>
                <div style={{ height: 6, width: `${n.intimacy}%`, background: "var(--gold)", borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="card">
          <div style={{ textAlign: "center", color: "var(--gold)" }}>📜【仙途史册】（只读，不可回溯更改）</div>
          {history && history.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-dim)", marginTop: 8 }}>史册空空，仙途尚未开始。</p>}
          {history?.map((h) => (
            <details key={h.turnNo} className="card" style={{ margin: "10px 0 0" }}>
              <summary style={{ fontSize: 13, cursor: "pointer", color: "var(--gold)" }}>
                第 {h.turnNo + 1} 月 · {h.actionKind}
              </summary>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, marginTop: 8, color: "var(--ink)" }}>
                {h.narrative}
              </div>
            </details>
          ))}
        </div>
      )}

      {tab === "month" && (<>

      {/* 未竟仙途 */}
      {view.destiny && (
        <div className="card">
          <div style={{ textAlign: "center", color: "var(--gold)" }}>📜【未竟仙途】</div>
          <div style={{ marginTop: 8, fontSize: 13 }}>
            🔴 天命主线 · {view.destiny.storylineKey} ｜ 阶段 {view.destiny.stage}/6
            <span style={{ color: "var(--ink-dim)" }}>
              ｜ {view.destiny.phase === "awaiting" ? "待抉择（天命之召 1-3 月）" : view.destiny.phase === "finale" ? "终幕已至" : "推进中"}
            </span>
          </div>
          {view.destiny.rewards.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-dim)" }}>
              已获：{view.destiny.rewards.slice(-3).join("；")}
            </div>
          )}
        </div>
      )}

      {/* 天机简报 */}
      {view.briefing && view.briefing.length > 0 && (
        <div className="card">
          <div style={{ textAlign: "center", color: "var(--gold)" }}>🔮【天机简报】</div>
          {view.briefing.map((sec) => (
            <div key={sec.title} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, color: "var(--gold)" }}>{sec.title}</div>
              {sec.items.map((it, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>- {it.text}</div>
              ))}
            </div>
          ))}
        </div>
      )}

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
          {settle.delta.destiny && (
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--gold)" }}>
              🌌 天命推进：{settle.delta.destiny.stageName} 完成，获得「{settle.delta.destiny.rewardNote}」
            </div>
          )}
          {settle.delta.relation && (
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--gold)" }}>
              🤝 与 {settle.delta.relation.npcName} 往来，好感 {settle.delta.relation.intimacy > 0 ? "+" : ""}{settle.delta.relation.intimacy}
            </div>
          )}
          {settle.delta.combat && (() => {
            const c = settle.delta.combat!;
            return (
              <div className="card" style={{ marginTop: 12, borderColor: c.outcome === "win" ? "var(--jade)" : "var(--cinnabar)" }}>
                <div style={{ textAlign: "center", fontSize: 13, color: "var(--ink-dim)" }}>⚔️ 斗法结算</div>
                <div style={{ textAlign: "center", margin: "10px 0", fontSize: 40 }} className="dice-roll">
                  {DICE_FACES[c.dice.face] ?? "🎲"}
                </div>
                <div style={{ textAlign: "center", fontSize: 13 }}>
                  对手：{c.foe.name}（战力 {c.foePower}）｜ 你（战力 {c.playerPower}）
                </div>
                <div style={{ textAlign: "center", marginTop: 6, fontSize: 18, fontWeight: 700, color: c.outcome === "win" ? "var(--jade)" : "var(--cinnabar)" }}>
                  {c.outcome === "win" ? "🎉 胜" : "💀 败"}
                  {c.punishApplied ? <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>｜修为 -{c.punishApplied.realmLoss} 级</span> : null}
                </div>
              </div>
            );
          })()}
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
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              value={freeform}
              onChange={(e) => setFreeform(e.target.value)}
              placeholder="🖋️ 或自由描述本月行动，无视以上选项…"
              style={{ flex: 1, background: "#0000", border: "1px solid var(--gold-dim)", borderRadius: 6, padding: "8px 10px", color: "var(--ink)", fontSize: 13 }}
            />
            <button onClick={actFreeform} disabled={busy || freeform.trim().length < 2}
              style={{ background: "#c8a24b33", color: "var(--gold)", border: "1px solid var(--gold)", borderRadius: 6, padding: "8px 12px" }}>
              行动
            </button>
          </div>
        </div>
      )}
      </>)}

      {err && <p style={{ color: "var(--cinnabar)", fontSize: 12, marginTop: 8, textAlign: "center" }}>{err}</p>}

      <button onClick={() => router.push("/")}
        style={{ marginTop: 16, width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--gold-dim)", background: "#0000", color: "var(--ink-dim)" }}>
        ⬅ 返回存档列表
      </button>
    </main>
  );
}
