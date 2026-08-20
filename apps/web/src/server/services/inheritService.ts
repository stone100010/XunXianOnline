// InheritService：道统传承（设定·十七章）
// 寿元将尽（或主动）选择传承：绝大部分灵石与灵物（背包）、道缘网络、
// 功法心得（道基部分继承）、心腹道缘（亲密度≥80）延续；以继承者身份继续游戏
import type { PlayerState } from "@xunxian/shared";
import { store } from "../store.js";
import { ServiceError } from "./archiveService.js";

export interface InheritResult {
  narrative: string;
  heirName: string;
  state: PlayerState;
  inherited: { stones: number; items: number; relationsKept: number; techniqueLevel: number };
}

export async function inherit(
  archiveId: string, deviceId: string, input: { heirName: string },
): Promise<InheritResult> {
  const archive = await store.findArchive(archiveId);
  if (!archive) throw new ServiceError(404, "存档不存在");
  if (archive.deviceId !== deviceId) throw new ServiceError(403, "无权访问该存档");
  const state = await store.getPlayerState(archiveId);
  if (!state) throw new ServiceError(500, "存档状态缺失");

  const heirName = input.heirName.trim();
  if (heirName.length < 1 || heirName.length > 12) throw new ServiceError(422, "继承者姓名须为 1-12 字");

  // 传承条件：寿元将尽（余量 < 10 年）或大限已至；也允许道心坚定的主动传承（任意时刻）
  const lifespanLow = state.cultivation.lifespanYears <= 10;

  // ── 继承结算（十七章）──
  const stones = Math.floor((state.currencies.low ?? 0) * 0.9);   // 绝大部分灵石资产
  const inventory = await store.getInventory(archiveId);           // 灵物随储物袋传承
  const allRelations = await store.getRelations(archiveId);
  const keptRelations = allRelations.filter((r) => r.intimacy >= 80 || r.tier >= 4); // 心腹道缘
  const retainedRelations = keptRelations.length > 0 ? keptRelations : allRelations.filter((r) => r.tier >= 2).slice(0, 3); // 至少延续熟识以上

  // 道基部分继承（功法心得）：各维 50% 向下取整
  const daoBases = Object.fromEntries(
    Object.entries(state.daoBases).map(([k, v]) => [k, { ...v, level: Math.max(1, Math.floor(v.level * 0.5)), exp: 0 }]),
  ) as PlayerState["daoBases"];

  // 继承者：年轻之躯，凡人重修但保留本命法宝与功法心得（主修功法等级 60% 延续）
  const next: PlayerState = {
    ...state,
    name: heirName,
    age: 16,
    turnNo: state.turnNo + 1,
    cultivation: { level: 1, exp: 0, lifespanYears: 100 },
    realm: "fanren",
    daoBases,
    currencies: { low: stones, mid: 0, high: 0, supreme: 0, crystal: 0 },
    combat: {
      ...state.combat,
      mainTechniqueLevel: Math.max(1, Math.floor(state.combat.mainTechniqueLevel * 0.6)),
      momentum: 0,
    },
    // 背包（含本命法宝）延续，无需变更
  };
  await store.savePlayerState(archiveId, next);
  await store.saveRelations(archiveId, retainedRelations);
  await store.updateArchiveStatus(archiveId, "active"); // 以继承者身份继续
  await store.appendTurnRecord({
    archiveId, turnNo: next.turnNo, seed: state.turnNo + 1,
    actionKind: "inherit", actionInput: { heirName, lifespanLow },
    engineDelta: { inherit: { stones, items: inventory.length, relationsKept: retainedRelations.length } },
    narrative: `道统传承：${state.name}将衣钵传于${heirName}。灵石 ${stones} 枚、储物袋 ${inventory.length} 件灵物、道缘 ${retainedRelations.length} 位延续。道统绵延，仙途再启。`,
    modelMeta: { provider: "engine" },
  });

  return {
    narrative: lifespanLow
      ? `寿元将尽，${state.name}于洞府中唤来${heirName}，将毕生所学倾囊相授。灯灭之时，道统不灭——${heirName}睁开双眼，识海中已多出一段不属于自己、却甘愿背负的记忆。（继承：灵石 ${stones}、灵物 ${inventory.length} 件、心腹道缘 ${retainedRelations.length} 位、道基五成、功法心得六成）`
      : `${state.name}主动开坛传法，立${heirName}为衣钵传人。自此道统绵延，二人以师徒相称，仙途各自行。（继承清单：灵石 ${stones}、灵物 ${inventory.length} 件、道缘 ${retainedRelations.length} 位、道基五成、功法心得六成）`,
    heirName,
    state: next,
    inherited: {
      stones, items: inventory.length,
      relationsKept: retainedRelations.length,
      techniqueLevel: next.combat.mainTechniqueLevel,
    },
  };
}
