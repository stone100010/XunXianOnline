// TurnService：回合处理管线（docs/02 §3）
// 意图归一 → 引擎结算 → 罗盘生成 → LLM 叙事（先算后写/模板降级）→ 持久化
import {
  addCultivationExp, createRng, generateCompass, hashSeed, resolveCombat,
  realmOfLevel, truePower, expToNextLevel,
} from "@xunxian/engine";
import type { CompassOption } from "@xunxian/engine";
import type { PlayerState } from "@xunxian/shared";
import { store } from "../store.js";
import { NarrativeService } from "../llm/index.js";
import { ServiceError } from "./archiveService.js";

const narrative = new NarrativeService(null); // LLM 未配置 → 模板降级；接 provider 后升级

// ── 行动结算原语（v0：修炼/探索/战斗/闭关骨架，后续接 actions 注册表）──
interface ActionOutcome {
  actionKind: string;
  cultivationGain: number;
  levelsGained: number;
  combatResult?: ReturnType<typeof resolveCombat>;
  narrativeInput: { actionLabel: string };
}

function settleAction(state: PlayerState, option: CompassOption, rng: ReturnType<typeof createRng>): ActionOutcome {
  const kind = option.kind;
  // 修炼速度 = 境界基准 × 灵根修正（v0 简化：闭关 1.5x、百艺 0.2x、其余 0.5x）
  const baseExp = expToNextLevel(state.cultivation.level) * 0.25;
  const rootMod = 1 + state.spiritRoot.speedModifier;
  const kindFactor = kind === "biguan" ? 1.5 : kind === "baiyi" ? 0.2 : 0.5;
  const gain = Math.max(1, Math.round(baseExp * rootMod * kindFactor));
  const r = addCultivationExp(state.cultivation, gain);

  // 历练探索 20% 概率遭遇战斗（临时妖兽对手，后续接事件链/妖兽表）
  let combatResult: ActionOutcome["combatResult"];
  if (kind === "lishi" && rng.chance(0.2)) {
    combatResult = resolveCombat({
      nature: "yaoshou",
      foe: {
        id: `beast_${state.turnNo}`,
        name: "赤目妖狼",
        realmLevel: state.cultivation.level + rng.int(-3, 9),
        power: Math.round(truePower(state.cultivation.level, state.combat) * rng.next() * 1.2 + 5),
      },
      player: {
        realmLevel: state.cultivation.level,
        combat: state.combat,
        daoRhyme: state.daoRhyme,
      },
    }, rng);
  }

  return {
    actionKind: kind,
    cultivationGain: gain,
    levelsGained: r.levelsGained,
    combatResult,
    narrativeInput: { actionLabel: option.label },
  };
}

// ── 罗盘上下文组装（v0：天命/因缘池由剧本层接入，暂用兜底）──
function compassCtxFor(state: PlayerState) {
  return {
    gameMonth: state.gameMonth,
    destinyOptions: [],
    karmaOptions: [],
    exploreOptions: [],
    socialOptions: [],
    artOptions: [],
    secludeOptions: [],
  };
}

function monthSeed(archiveId: string, turnNo: number): number {
  return hashSeed(archiveId, turnNo);
}

// ── 对外 API ──

export interface TurnView {
  state: PlayerState;
  realmName: string;
  compass: CompassOption[];
}

/** GET /turn：本月开局视图（无罗盘则生成） */
export async function getTurnView(archiveId: string, deviceId: string): Promise<TurnView> {
  await assertOwner(archiveId, deviceId);
  const state = await requireState(archiveId);
  let compass = await store.getCompass(archiveId, state.turnNo);
  if (!compass) {
    compass = generateCompass(compassCtxFor(state), createRng(monthSeed(archiveId, state.turnNo)));
    await store.saveCompass(archiveId, state.turnNo, compass);
  }
  return { state, realmName: realmOfLevel(state.cultivation.level).name, compass };
}

export interface SettlementView {
  turnNo: number;
  narrative: string;
  degraded: boolean;
  delta: {
    cultivationGain: number;
    levelsGained: number;
    realmName: string;
    combat?: unknown;
  };
  state: PlayerState;
}

/** POST /turn/action：提交行动（罗盘选项）→ 结算+叙事+落库 */
export async function submitAction(
  archiveId: string, deviceId: string, turnNo: number, optionIdx: number,
): Promise<SettlementView> {
  await assertOwner(archiveId, deviceId);
  const state = await requireState(archiveId);
  if (turnNo !== state.turnNo) throw new ServiceError(409, "回合号不匹配（请刷新后重试）");

  const compass = await store.getCompass(archiveId, state.turnNo);
  if (!compass) throw new ServiceError(409, "本月罗盘未生成");
  const existing = await store.getTurnRecord(archiveId, state.turnNo);
  if (existing) throw new ServiceError(409, "本回合已结算，不可重复提交（防 SL）");
  const option = compass.find((o) => o.idx === optionIdx);
  if (!option) throw new ServiceError(400, `选项 ${optionIdx} 不存在`);

  const rng = createRng(monthSeed(archiveId, state.turnNo));
  const outcome = settleAction(state, option, rng);

  // 应用结算（战斗失败的修为倒退在 resolvedCultivation 中统一处理）
  const updated: PlayerState = {
    ...state,
    cultivation: resolvedCultivation(state, outcome),
  };

  const nar = await narrative.narrate({
    state, actionLabel: outcome.narrativeInput.actionLabel,
    cultivationGain: outcome.cultivationGain,
    levelsGained: outcome.levelsGained,
    combat: outcome.combatResult,
    nextMonth: state.gameMonth + 1,
  });

  await store.savePlayerState(archiveId, updated);
  await store.appendTurnRecord({
    archiveId, turnNo, seed: monthSeed(archiveId, turnNo),
    actionKind: outcome.actionKind, actionInput: { optionIdx },
    engineDelta: { cultivationGain: outcome.cultivationGain, levelsGained: outcome.levelsGained },
    narrative: nar.narrative, modelMeta: nar.modelMeta,
  });

  return {
    turnNo,
    narrative: nar.narrative,
    degraded: nar.degraded,
    delta: {
      cultivationGain: outcome.cultivationGain,
      levelsGained: outcome.levelsGained,
      realmName: realmOfLevel(updated.cultivation.level).name,
      combat: outcome.combatResult,
    },
    state: updated,
  };
}

function resolvedCultivation(state: PlayerState, outcome: ActionOutcome) {
  const r = addCultivationExp(state.cultivation, outcome.cultivationGain);
  if (outcome.combatResult?.outcome === "lose" && outcome.combatResult.punishApplied) {
    return { ...r.state, level: Math.max(1, r.state.level - outcome.combatResult.punishApplied.realmLoss) };
  }
  return r.state;
}

/** POST /turn/next：进入下月（时间/年龄/寿元推进 + 新罗盘） */
export async function nextMonth(archiveId: string, deviceId: string, turnNo: number): Promise<TurnView> {
  await assertOwner(archiveId, deviceId);
  const state = await requireState(archiveId);
  if (turnNo !== state.turnNo) throw new ServiceError(409, "回合号不匹配（请刷新后重试）");

  let { gameYear, gameMonth, age } = state;
  let lifespanYears = state.cultivation.lifespanYears;
  gameMonth += 1;
  if (gameMonth > 12) { gameMonth = 1; gameYear += 1; age += 1; } // 每 12 回合骨龄+1
  lifespanYears = Math.max(0, lifespanYears - (gameMonth === 1 ? 1 : 0));

  const updated: PlayerState = { ...state, turnNo: state.turnNo + 1, gameYear, gameMonth, age, cultivation: { ...state.cultivation, lifespanYears } };
  await store.savePlayerState(archiveId, updated);

  const compass = generateCompass(compassCtxFor(updated), createRng(monthSeed(archiveId, updated.turnNo)));
  await store.saveCompass(archiveId, updated.turnNo, compass);
  return { state: updated, realmName: realmOfLevel(updated.cultivation.level).name, compass };
}

async function assertOwner(archiveId: string, deviceId: string) {
  const archive = await store.findArchive(archiveId);
  if (!archive) throw new ServiceError(404, "存档不存在");
  if (archive.deviceId !== deviceId) throw new ServiceError(403, "无权访问该存档");
}

async function requireState(archiveId: string): Promise<PlayerState> {
  const state = await store.getPlayerState(archiveId);
  if (!state) throw new ServiceError(500, "存档状态缺失");
  return state;
}
