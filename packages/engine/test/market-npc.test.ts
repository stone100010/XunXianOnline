import { describe, expect, it } from "vitest";
import { bargain, canEnterMarket, rollShelf } from "../src/market/index.js";
import { applyInteraction, generateNpc, NpcPool, relationTierOf } from "../src/npc/index.js";
import { createRng } from "../src/rng/index.js";

describe("坊市（十六章）", () => {
  it("货架 3-6 件且价格含波动", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const shelf = rollShelf("zhengshi", "s", createRng(seed));
      expect(shelf.items.length).toBeGreaterThanOrEqual(3);
      expect(shelf.items.length).toBeLessThanOrEqual(6);
      expect(shelf.items.every((i) => i.price >= 1)).toBe(true);
    }
  });
  it("秘库准入：金丹（41 级）或核心弟子", () => {
    expect(canEnterMarket("miku", 40)).toBe(false);
    expect(canEnterMarket("miku", 41)).toBe(true);
    expect(canEnterMarket("miku", 20, true)).toBe(true);
  });
  it("黑市议价空间大于正市", () => {
    const heishi = rollShelf("heishi", "s", createRng(1));
    const zhengshi = rollShelf("zhengshi", "s", createRng(1));
    expect(heishi.discountRate).toBeGreaterThan(zhengshi.discountRate);
  });
  it("议价结果确定性且不低于底价", () => {
    const shelf = rollShelf("heishi", "s", createRng(2));
    const item = shelf.items[0]!;
    for (let skill = 0; skill <= 50; skill += 10) {
      const r = bargain(shelf, item, skill, createRng(5));
      expect(r.finalPrice).toBeLessThanOrEqual(item.price);
      expect(r.finalPrice).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("NPC 池（十一章，池化复用模式）", () => {
  it("生成 NPC 字段完整、战力=修为+装备+功法", () => {
    const npc = generateNpc(createRng(1));
    expect(npc.traits.length).toBeGreaterThanOrEqual(2);
    expect(npc.power).toBe(npc.realmLevel + npc.equipmentLevel + npc.techniqueLevel);
  });
  it("相似度匹配复用：同需求二次取用同一 NPC", () => {
    const pool = new NpcPool(200, createRng(10));
    const rng = createRng(11);
    const a = pool.acquire(rng, { domain: "zhongzhou", profession: "炼丹师", realmRange: [20, 30] });
    // 生成后入池，再次查询应复用（相似度 > 2）
    const b = pool.acquire(rng, { domain: "zhongzhou", profession: "炼丹师", realmRange: [20, 30] });
    expect(b.id).toBe(a.id);
  });
  it("池规模受控不超上限", () => {
    const pool = new NpcPool(50, createRng(1));
    const rng = createRng(2);
    for (let i = 0; i < 100; i++) {
      pool.acquire(rng, { realmRange: [rng.int(1, 90), 95] });
    }
    expect(pool.size()).toBeLessThanOrEqual(50);
  });
});

describe("道缘层级（十一章三）", () => {
  it("层级递进判定", () => {
    expect(relationTierOf({ tier: 0, intimacy: 0, interactions: 0, sharedEvents: 0 })).toBe(0);
    expect(relationTierOf({ tier: 1, intimacy: 10, interactions: 1, sharedEvents: 0 })).toBe(1);
    expect(relationTierOf({ tier: 2, intimacy: 40, interactions: 3, sharedEvents: 0 })).toBe(2);
    expect(relationTierOf({ tier: 3, intimacy: 60, interactions: 8, sharedEvents: 1 })).toBe(3);
    expect(relationTierOf({ tier: 4, intimacy: 80, interactions: 20, sharedEvents: 3 })).toBe(4);
  });
  it("往来互动：成功 +5~15 亲密度并重算层级", () => {
    let r = { tier: 0, intimacy: 0, interactions: 0, sharedEvents: 0 } as const;
    const rng = createRng(3);
    const out = applyInteraction(r, true, rng);
    expect(out.intimacy).toBeGreaterThanOrEqual(5);
    expect(out.interactions).toBe(1);
    expect(out.tier).toBeGreaterThanOrEqual(1);
  });
  it("失当往来扣减亲密度", () => {
    const rng = createRng(4);
    const out = applyInteraction({ tier: 2, intimacy: 50, interactions: 5, sharedEvents: 0 }, false, rng);
    expect(out.intimacy).toBeLessThan(50);
  });
});
