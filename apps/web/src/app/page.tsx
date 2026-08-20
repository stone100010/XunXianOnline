import { START_PACKS } from "@xunxian/content";

export default function Home() {
  return (
    <main>
      <h1 style={{ marginTop: 48, textAlign: "center", color: "var(--gold)", fontSize: 24 }}>
        ✨⋆｡°✩ ༺ 寻 仙 · 天 命 待 择 ༻ ✩°｡⋆✨
      </h1>
      <p style={{ marginTop: 12, textAlign: "center", color: "var(--ink-dim)" }}>
        玄幻修仙模拟器 · 建设中（P3 核心循环开发阶段）
      </p>

      <div className="card">
        <h2 style={{ color: "var(--gold)", fontSize: 16 }}>⚜️ 十大天命开局</h2>
        {START_PACKS.map((p) => (
          <div key={p.key} style={{ marginTop: 10, fontSize: 14 }}>
            {p.id}. <b>{p.name}</b>
            <span style={{ color: "var(--ink-dim)" }}> ｜ 天命 · {p.destinyName}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
