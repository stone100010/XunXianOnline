import { describe, expect, it } from "vitest";
import { buildBriefing, evolveWorld, rollDomainSeeds, sampleKarmaEvents } from "../src/world/index.js";
import { createRng } from "../src/rng/index.js";
import { parseIntent } from "../src/actions/intent.js";
import { SECRET_REALM_TEMPLATES, canEnter, stepChain } from "../src/events/index.js";

describe("天下演化（十四章）", () => {
  it("七域种子五项属性生成且在 [0,1]", () => {
    const seeds = rollDomainSeeds(createRng(1));
    expect(Object.keys(seeds)).toHaveLength(7);
    for (const attrs of Object.values(seeds)) {
      for (const v of Object.values(attrs)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
  it("演化产生表闻为主、偶有中变/底流（千月采样）", () => {
    const seeds = rollDomainSeeds(createRng(9));
    const rng = createRng(100);
    let biaowen = 0, zhongbian = 0, diuliu = 0;
    for (let m = 0; m < 1000; m++) {
      for (const e of evolveWorld(seeds, rng)) {
        if (e.layer === "biaowen") biaowen++;
        else if (e.layer === "zhongbian") zhongbian++;
        else diuliu++;
      }
    }
    expect(biaowen).toBeGreaterThan(1000);
    expect(zhongbian).toBeGreaterThan(10);
    expect(diuliu).toBeGreaterThan(0);
    expect(biaowen).toBeGreaterThan(zhongbian);
    expect(zhongbian).toBeGreaterThan(diuliu);
  });
  it("天机简报按四类分栏且过滤空栏", () => {
    const events = evolveWorld(rollDomainSeeds(createRng(3)), createRng(500));
    for (let m = 0; m < 50 && events.length < 5; m++) {
      events.push(...evolveWorld(rollDomainSeeds(createRng(3)), createRng(500 + m)));
    }
    const briefing = buildBriefing(events);
    expect(briefing.every((s) => s.items.length > 0)).toBe(true);
  });
  it("因缘际会清单不重复且方向选项完整（七章）", () => {
    const events = sampleKarmaEvents(createRng(7), 3);
    expect(events).toHaveLength(3);
    expect(new Set(events.map((e) => e.kind)).size).toBe(3);
    for (const e of events) expect(e.options.length).toBeGreaterThanOrEqual(2);
  });
});

describe("意图解析（docs/05 §5）", () => {
  const rng = createRng(1);
  it("高置信度直接解析", () => {
    const i = parseIntent("闭关苦修一月，冲击瓶颈", rng);
    expect(i.action).toBe("seclude");
    expect(i.confidence).toBeGreaterThanOrEqual(0.8);
  });
  it("多关键词排序取最优", () => {
    const i = parseIntent("去坊市买些丹药，顺便砍价", rng);
    expect(["trade", "bargain"]).toContain(i.action);
    expect(i.confidence).toBeGreaterThanOrEqual(0.8);
  });
  it("无法识别 → freeform 低置信度", () => {
    const i = parseIntent("我想静静地看着月亮发呆", rng);
    expect(i.action).toBe("freeform");
    expect(i.confidence).toBeLessThan(0.4);
  });
  it("空输入", () => {
    expect(parseIntent("", rng).confidence).toBe(0);
  });
});

describe("事件链状态机（docs/06）", () => {
  const gu = SECRET_REALM_TEMPLATES.find((d) => d.key === "gu_xiushi_dongfu")!;
  const rng = createRng(42);

  it("入口条件：凡人可入古修士洞府", () => {
    expect(canEnter(gu, { realmLevel: 1, flags: {}, turnNo: 0 })).toBe(true);
    const moGu = SECRET_REALM_TEMPLATES.find((d) => d.key === "zhui_mo_gu")!;
    expect(canEnter(moGu, { realmLevel: 5, flags: {}, turnNo: 0 })).toBe(false);
    expect(canEnter(moGu, { realmLevel: 11, flags: {}, turnNo: 0 })).toBe(true);
  });
  it("判定成功迁移、失败停留", () => {
    const state = { chainKey: gu.key, currentNodeId: "entry", startedTurn: 0, vars: {} };
    let passed: boolean | undefined; let failed: boolean | undefined;
    for (let i = 0; i < 100; i++) {
      const r = stepChain(gu, state, 1, { realmLevel: 10, flags: {} }, rng);
      if (r.judgmentPassed) passed = true; else failed = true;
    }
    expect(passed).toBe(true);
    expect(failed).toBe(true);
  });
  it("无判定选项必成功并结束链", () => {
    const state = { chainKey: gu.key, currentNodeId: "entry", startedTurn: 0, vars: {} };
    const r = stepChain(gu, state, 2, { realmLevel: 10, flags: {} }, rng);
    expect(r.judgmentPassed).toBe(true);
    expect(r.nextNodeId).toBeNull();
    expect(r.effects).toHaveLength(1);
  });
  it("非法选项抛出错误", () => {
    const state = { chainKey: gu.key, currentNodeId: "entry", startedTurn: 0, vars: {} };
    expect(() => stepChain(gu, state, 99, { realmLevel: 10, flags: {} }, rng)).toThrow();
  });
});
