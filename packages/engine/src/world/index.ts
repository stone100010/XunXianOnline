import type { EventLayer } from "@xunxian/shared";
import type { Rng } from "../rng/index.js";

// ── 天下演化（设定·十四、十五章）：回合驱动的骰子引擎，产出结构化动态 ──

export interface DomainSeedAttrs {
  lingmai: number;    // 灵脉浓度
  yaoshou: number;    // 妖兽密度
  zhengmo: number;    // 正魔势力比 0-1
  mijin: number;      // 秘境活跃度
  yiji: number;       // 上古遗迹密度
}

export interface WorldEvent {
  layer: EventLayer;      // 表闻/中变/底流
  kind: string;           // 域动态/势力/轶闻/行情
  domain?: string;
  text: string;           // 结构化事实文本（LLM 润色底稿）
}

export interface BriefingItem { title: string; items: WorldEvent[] }

/** 每月演化六维判定（十四章）：返回本月事件列表（表闻为主，小概率中变/底流） */
export function evolveWorld(seeds: Record<string, DomainSeedAttrs>, rng: Rng): WorldEvent[] {
  const events: WorldEvent[] = [];
  for (const [domain, attrs] of Object.entries(seeds)) {
    // 表闻：灵材市价波动（灵脉浓度驱动）
    if (rng.chance(0.3 + attrs.lingmai * 0.2)) {
      const up = rng.chance(0.5);
      const pct = rng.int(5, 30);
      events.push({
        layer: "biaowen", kind: "行情", domain,
        text: `${domain}灵材市价${up ? "上涨" : "下跌"}约${pct}%`,
      });
    }
    // 表闻：修士流动
    if (rng.chance(0.15)) {
      events.push({
        layer: "biaowen", kind: "域动态", domain,
        text: rng.chance(0.5) ? `${domain}有新散修涌入，坊市人气渐旺` : `${domain}老牌势力收缩，数家店铺易主`,
      });
    }
    // 中变：天象异变（秘境活跃度驱动）
    if (rng.chance(0.03 + attrs.mijin * 0.05)) {
      events.push({
        layer: "zhongbian", kind: "域动态", domain,
        text: `${domain}深处灵气涌动，疑似秘境出世`,
      });
    }
    // 中变：势力消长
    if (rng.chance(0.04)) {
      events.push({
        layer: "zhongbian", kind: "势力", domain,
        text: rng.chance(0.5)
          ? `${domain}两大宗门因灵脉之争边境摩擦加剧`
          : `${domain}一小门派被吞并，势力版图变动`,
      });
    }
    // 底流：天降机缘（极小概率）
    if (rng.chance(0.005 + attrs.yiji * 0.01)) {
      events.push({
        layer: "diuliu", kind: "域动态", domain,
        text: `${domain}某处上古传承气息若隐若现，尚无人察觉`,
      });
    }
  }
  return events;
}

/** 区域五项种子随机生成（十四章） */
export function rollDomainSeeds(rng: Rng): Record<string, DomainSeedAttrs> {
  const domains = ["zhongzhou", "donghuang", "nanming", "xiji", "beiming", "lingnan", "haiwai"];
  return Object.fromEntries(domains.map((d) => [d, {
    lingmai: rng.next(), yaoshou: rng.next(), zhengmo: rng.next(),
    mijin: rng.next(), yiji: rng.next(),
  }]));
}

// ── 天机简报（十五章）：四栏结构化条目 ──
export function buildBriefing(events: WorldEvent[]): BriefingItem[] {
  const sections: BriefingItem[] = [
    { title: "🗺️ 修真域动态", items: events.filter((e) => e.kind === "域动态" && e.layer === "biaowen") },
    { title: "⚔️ 势力消长", items: events.filter((e) => e.kind === "势力") },
    { title: "📈 灵材行情", items: events.filter((e) => e.kind === "行情") },
  ];
  return sections.filter((s) => s.items.length > 0);
}

// ── 因缘际会（七章）：5 月末生成 6-7 月事件清单 ──
export interface KarmaEvent {
  kind: "zongmenDabi" | "mijingChushi" | "shouchao" | "kuayuChongtu" | "yiwenFajiao" | "paimai";
  name: string;
  options: string[];        // 玩家方向（参赛/观战/无视等）
}

const KARMA_TEMPLATES: { kind: KarmaEvent["kind"]; name: string; options: string[]; weight: number }[] = [
  { kind: "zongmenDabi", name: "本地宗门将举行大比，前十可入内门", options: ["参赛", "观战", "无视"], weight: 3 },
  { kind: "mijingChushi", name: "天机阁预告：一处上古秘境将于两月后开启", options: ["抢先进入", "组队探索", "外围捡漏"], weight: 2 },
  { kind: "shouchao", name: "边陲妖兽躁动，兽潮将起", options: ["参与救援", "趁机牟利", "撤离避险"], weight: 2 },
  { kind: "kuayuChongtu", name: "正魔两道在边境爆发局部冲突", options: ["参战（选边）", "调停", "发战争财"], weight: 2 },
  { kind: "yiwenFajiao", name: "传闻本域一位金丹真人即将出关", options: ["前往祝贺", "趁虚而入", "无视"], weight: 2 },
  { kind: "paimai", name: "年度跨域拍卖会将在中州举行", options: ["竞拍", "出售珍品", "结识大人物"], weight: 2 },
];

export function sampleKarmaEvents(rng: Rng, count = 3): KarmaEvent[] {
  const picked = new Set<string>();
  const out: KarmaEvent[] = [];
  let guard = 0;
  while (out.length < count && guard++ < 30) {
    const t = rng.weighted(KARMA_TEMPLATES.map((x) => [x, x.weight] as [typeof x, number]));
    if (picked.has(t.kind)) continue;
    picked.add(t.kind);
    out.push({ kind: t.kind, name: t.name, options: t.options });
  }
  return out;
}
