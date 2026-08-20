import type { PlayerState, SpiritRoot } from "@xunxian/shared";
import { startPackByKey, type StartPackDef } from "@xunxian/content";
import type { Rng } from "../rng/index.js";
import { realmOfLevel } from "../constants/realms.js";

export interface CreateCharacterInput {
  name: string;
  gender: "male" | "female";
  race: "human" | "yao" | "ling";
  age: number;                 // 16-99
  domain: PlayerState["location"]["domain"];
  packKey: string;             // 开局包 key（决定初始修为/资产/天命主线）
  daoRhymeKey: string;         // 先天道韵 key
  archiveId: string;
}

/** 灵根随机生成（二章一.4：创建时随机；开局包保底待剧本层接入） */
export function rollSpiritRoot(rng: Rng): SpiritRoot {
  const roll = rng.next();
  let grade: SpiritRoot["grade"];
  if (roll < 0.05) grade = "fei";
  else if (roll < 0.35) grade = "fan";
  else if (roll < 0.75) grade = "zhong";
  else if (roll < 0.92) grade = "shang";
  else if (roll < 0.98) grade = "ji";
  else grade = "yi";

  if (grade === "fei") {
    return { elements: ["metal", "wood", "water", "fire", "earth"], grade, purity: 0.1, speedModifier: -0.5 };
  }
  const base = ["metal", "wood", "water", "fire", "earth"] as const;
  const exotic = ["thunder", "ice", "wind", "dark", "light"] as const;
  if (grade === "yi") {
    const el = exotic[rng.int(0, exotic.length)]!;
    return { elements: [el], grade, purity: 0.8, speedModifier: 0.4 };
  }
  const count = grade === "zhong" ? rng.int(2, 4) : rng.int(1, 3);
  const els = rng.shuffle([...base]).slice(0, Math.min(count, grade === "ji" ? 1 : count));
  const purityByGrade = { fan: 0.2, zhong: 0.4, shang: 0.7, ji: 0.95, yi: 0.8, fei: 0.1 } as const;
  const modByGrade = { fan: -0.2, zhong: 0, shang: 0.2, ji: 0.5, yi: 0.4, fei: -0.5 } as const;
  return { elements: els, grade, purity: purityByGrade[grade], speedModifier: modByGrade[grade] };
}

/** 编译建角选择 → 初始玩家状态（含开局包资产/修为/寿元） */
export function createCharacter(input: CreateCharacterInput, rng: Rng): {
  state: PlayerState;
  pack: StartPackDef;
  spiritRoot: SpiritRoot;
} {
  const pack = startPackByKey(input.packKey);
  const level = pack.initialRealmLevel;
  const realm = realmOfLevel(level);
  const spiritRoot = rollSpiritRoot(rng);

  // 年龄段修正（二章一.3）
  let wuxinBonus = 0;
  if (input.race === "human") wuxinBonus = 5;          // 人族悟性+5%
  const genkuBonus = input.race === "yao" ? 10 : 0;     // 妖族根骨+10%
  const qiyunBonus = input.race === "ling" ? 5 : 0;     // 灵族气运+5%
  const daoxinBonus = input.age >= 46 ? 5 : 0;          // 中老年道心加成

  const state: PlayerState = {
    archiveId: input.archiveId,
    turnNo: 0,
    gameYear: 1,
    gameMonth: 1,
    name: input.name,
    gender: input.gender,
    race: input.race,
    age: input.age,
    realm: realm.key,
    cultivation: {
      level,
      exp: 0,
      lifespanYears: Math.max(10, realm.lifespanCap - input.age),
    },
    daoBases: {
      wuxin: { level: 1 + Math.floor(wuxinBonus / 5), exp: 0 },
      daoxin: { level: 1 + Math.floor(daoxinBonus / 5), exp: 0 },
      genku: { level: 1 + Math.floor(genkuBonus / 5), exp: 0 },
      qiyun: { level: 1 + Math.floor(qiyunBonus / 5), exp: 0 },
      xuema: { level: 1, exp: 0 },
    },
    daoRhyme: { key: input.daoRhymeKey, level: 1, exp: 0 },
    spiritRoot,
    combat: {
      mainEquipmentLevel: pack.initialRealmLevel >= 11 ? 1 : 0, // 法器开局
      mainTechniqueLevel: 1,
      concealment: 0,
      momentum: 0,
    },
    currencies: { low: pack.initialCurrencies.low, mid: 0, high: 0, supreme: 0, crystal: 0 },
    location: { domain: input.domain, region: null, place: null },
  };
  return { state, pack, spiritRoot };
}
