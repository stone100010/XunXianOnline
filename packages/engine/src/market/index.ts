// 坊市系统（设定·十六章）：三级交易网络 + 每月货架确定性生成
import type { Rng } from "../rng/index.js";

export type MarketTier = "zhengshi" | "heishi" | "miku"; // 正市/地下黑市/宗门秘库

export interface MarketItem {
  key: string;
  name: string;
  category: "dan" | "qi" | "fu" | "zhen" | "caiyao" | "gongfa" | "qingbao";
  price: number;          // 下品灵石
  grade: number;          // 0-10（对应法器等级体系）
  desc: string;
}

export interface MarketShelf {
  tier: MarketTier;
  tierName: string;
  discountRate: number;   // 议价空间（正市小、黑市大）
  items: MarketItem[];
}

// 物品基表（ref_items 的代码基线，入库后由管理后台扩充）
const BASE_ITEMS: MarketItem[] = [
  { key: "juqi_dan", name: "聚气丹", category: "dan", price: 20, grade: 1, desc: "辅助炼气修炼，加速真元凝聚" },
  { key: "qingxin_dan", name: "清心丹", category: "dan", price: 35, grade: 1, desc: "稳定道心，抵抗心魔侵扰" },
  { key: "liaoshang_dan", name: "疗伤丹", category: "dan", price: 50, grade: 2, desc: "修复伤势，缩短休养期" },
  { key: "zhuji_dan", name: "筑基丹", category: "dan", price: 8000, grade: 4, desc: "筑基突破必备丹药" },
  { key: "tie_jian", name: "精铁剑", category: "qi", price: 60, grade: 1, desc: "凡兵利器，凡人境可用" },
  { key: "huoyun_dao", name: "火纹法刀", category: "qi", price: 900, grade: 3, desc: "上品法器，火系加成" },
  { key: "hushen_fu", name: "护身符", category: "fu", price: 120, grade: 2, desc: "抵消一次致命攻击（消耗品）" },
  { key: "jushi_zhen", name: "聚灵阵旗", category: "zhen", price: 300, grade: 2, desc: "小范围提升灵气浓度" },
  { key: "lingcao", name: "百年灵草", category: "caiyao", price: 40, grade: 1, desc: "炼丹基础灵材" },
  { key: "yaodan_c", name: "妖兽内丹", category: "caiyao", price: 150, grade: 2, desc: "炼器炼丹两用" },
  { key: "tuishui_fu", name: "遁水符", category: "fu", price: 90, grade: 1, desc: "水下活动半个时辰" },
];

const TIER_META: Record<MarketTier, { name: string; discount: number; entryRealm: number }> = {
  zhengshi: { name: "坊市正市", discount: 0.05, entryRealm: 1 },
  heishi: { name: "地下黑市", discount: 0.3, entryRealm: 1 },
  miku: { name: "宗门秘库", discount: 0.1, entryRealm: 41 },
};

/** 生成某月某坊市货架（3-6 件，确定性） */
export function rollShelf(tier: MarketTier, seedKey: string, rng: Rng): MarketShelf {
  const meta = TIER_META[tier];
  const count = rng.int(3, 7);
  // 黑市偏禁物情报类，秘库偏高阶；v0 用价格段过滤模拟
  const pool = BASE_ITEMS.filter((it) => {
    if (tier === "heishi") return true;
    if (tier === "miku") return it.price >= 500;
    return it.price <= 1000;
  });
  const items = rng.shuffle(pool).slice(0, count).map((it) => ({
    ...it,
    // 物价波动 ±20%
    price: Math.max(1, Math.round(it.price * (0.8 + rng.next() * 0.4))),
  }));
  return { tier, tierName: meta.name, discountRate: meta.discount, items };
}

/** 准入判定（十六章三：秘库需金丹或核心弟子） */
export function canEnterMarket(tier: MarketTier, realmLevel: number, isCoreDisciple = false): boolean {
  const meta = TIER_META[tier];
  return realmLevel >= meta.entryRealm || isCoreDisciple;
}

export interface TradeResult {
  ok: boolean;
  message: string;
  finalPrice: number;
}

/** 议价（十六章：正市空间小、黑市大） */
export function bargain(shelf: MarketShelf, item: MarketItem, bargainSkill: number, rng: Rng): TradeResult {
  const maxCut = shelf.discountRate + Math.min(0.15, bargainSkill * 0.002); // 百艺等级加成
  const cut = rng.next() * maxCut;
  const finalPrice = Math.max(1, Math.round(item.price * (1 - cut)));
  if (cut < 0.02) {
    return { ok: false, message: "掌柜摇了摇头：「这价码，不能再让了。」", finalPrice: item.price };
  }
  return {
    ok: true,
    message: cut > maxCut * 0.7
      ? "你巧舌如簧，掌柜咬牙让了价。"
      : "一番讨价还价，掌柜勉强松了口。",
    finalPrice,
  };
}
