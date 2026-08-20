import { describe, expect, it } from "vitest";
import { generateDaoFruitCode, isValidDaoFruitCode, normalizeDaoFruitCode } from "../src/server/daoFruitCode.js";
import { createRng } from "@xunxian/engine";

describe("道果码（二十章三）", () => {
  it("生成-校验往返一致（带校验位）", () => {
    const rng = createRng(1);
    for (let i = 0; i < 500; i++) {
      const code = generateDaoFruitCode(rng.next);
      expect(code).toHaveLength(8);
      expect(isValidDaoFruitCode(code)).toBe(true);
      // 篡改末位校验失败
      const bad = code.slice(0, 7) + (code[7] === "A" ? "B" : "A");
      expect(isValidDaoFruitCode(bad)).toBe(false);
    }
  });
  it("字符集排除 0/1/I/L/O", () => {
    const rng = createRng(2);
    for (let i = 0; i < 200; i++) {
      expect(generateDaoFruitCode(rng.next)).not.toMatch(/[01ILO0]/);
    }
  });
  it("normalize 支持连字符格式", () => {
    const rng = createRng(3);
    const code = generateDaoFruitCode(rng.next);
    expect(normalizeDaoFruitCode(`${code.slice(0, 4)}-${code.slice(4)}`)).toBe(code);
    expect(normalizeDaoFruitCode("INVALID1")).toBeNull();
  });
});
