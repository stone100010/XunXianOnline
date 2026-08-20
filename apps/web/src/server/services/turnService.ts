// TurnService：回合处理管线（docs/02 §3）
// 意图归一 → 引擎结算 → 罗盘生成 → LLM 叙事（先算后写/模板降级）→ 持久化
import {
  addCultivationExp, applyInteraction, buildBriefing, createRng, evolveWorld, expToNextLevel,
  generateCompass, hashSeed, parseIntent, realmOfLevel, resolveCombat,
  rollDomainSeeds, truePower,
} from "@xunxian/engine";
import type { CompassOption } from "@xunxian/engine";
import type { PlayerState } from "@xunxian/shared";
import { store } from "../store.js";
import type { StoredRelation } from "../store.js";
import { stageScript } from "@xunxian/content";
import { buildProviderFromEnv, NarrativeService } from "../llm/index.js";
import { ServiceError } from "./archiveService.js";

const narrative = new NarrativeService(buildProviderFromEnv()); // env 配置 GLM 即启用真实叙事，否则模板降级

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
/** 罗盘上下文：天命之召（1-3 月）注入当前主线阶段决策选项（六章一） */
async function compassCtxFor(archiveId: string, state: PlayerState) {
  const ctx = {
    gameMonth: state.gameMonth,
    destinyOptions: [] as { label: string; riskFlag?: boolean; destinyFlag?: boolean }[],
    karmaOptions: [] as { label: string }[],
    exploreOptions: [] as { label: string }[],
    socialOptions: [] as { label: string }[],
    artOptions: [] as { label: string }[],
    secludeOptions: [] as { label: string }[],
  };
  const destiny = await store.getDestiny(archiveId);
  if (destiny && state.gameMonth >= 1 && state.gameMonth <= 3 && destiny.phase === "awaiting") {
    const script = stageScript(destiny.storylineKey, destiny.stage);
    if (state.cultivation.level >= script.realmGate[0]) {
      ctx.destinyOptions = script.options.map((o) => ({
        label: `【天命·${script.name}】${o.label}`,
        riskFlag: o.riskFlag,
        destinyFlag: true,
      }));
    }
  }
  return ctx;
}

function monthSeed(archiveId: string, turnNo: number): number {
  return hashSeed(archiveId, turnNo);
}

// ── 对外 API ──

export interface TurnView {
  state: PlayerState;
  realmName: string;
  compass: CompassOption[];
  briefing: { title: string; items: { text: string }[] }[];
  destiny?: { storylineKey: string; stage: number; phase: string; waitingYears: number; rewards: string[] };
}

/** 天机简报：由存档种子+回合号确定性生成（同回合刷新不变化） */
function briefingFor(archiveSeed: number, turnNo: number) {
  const seeds = rollDomainSeeds(createRng(hashSeed(archiveSeed, "world")));
  const events = evolveWorld(seeds, createRng(hashSeed(archiveSeed, "brief", turnNo)));
  return buildBriefing(events);
}

/** GET /turn：本月开局视图（无罗盘则生成） */
export async function getTurnView(archiveId: string, deviceId: string): Promise<TurnView> {
  await assertOwner(archiveId, deviceId);
  const state = await requireState(archiveId);
  let compass = await store.getCompass(archiveId, state.turnNo);
  if (!compass) {
    compass = generateCompass(await compassCtxFor(archiveId, state), createRng(monthSeed(archiveId, state.turnNo)));
    await store.saveCompass(archiveId, state.turnNo, compass);
  }
  const briefing = briefingFor(archiveSeedOf(archiveId), state.turnNo);
  const destiny = await store.getDestiny(archiveId) ?? undefined;
  return { state, realmName: realmOfLevel(state.cultivation.level).name, compass, briefing, destiny };
}

/** 存档种子（v0：由 archiveId 派生；接入 DB 后读 archives.seed） */
function archiveSeedOf(archiveId: string): number {
  return hashSeed(archiveId, "seed");
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
    relation?: { npcName: string; intimacy: number; tier: number };
    destiny?: { storyline: string; stage: number; stageName: string; optionLabel: string; rewardNote: string; nextPhase: string };
  };
  state: PlayerState;
}

/** POST /turn/action：提交行动（罗盘选项或自由描述）→ 结算+叙事+落库 */
export async function submitAction(
  archiveId: string, deviceId: string, turnNo: number,
  input: { optionIdx?: number; freeform?: string },
): Promise<SettlementView> {
  await assertOwner(archiveId, deviceId);
  const state = await requireState(archiveId);
  if (turnNo !== state.turnNo) throw new ServiceError(409, "回合号不匹配（请刷新后重试）");

  let compass = await store.getCompass(archiveId, state.turnNo);
  if (!compass) {
    // 惰性生成（建角后未打开开局页直接行动的场景）
    compass = generateCompass(await compassCtxFor(archiveId, state), createRng(monthSeed(archiveId, state.turnNo)));
    await store.saveCompass(archiveId, state.turnNo, compass);
  }
  const existing = await store.getTurnRecord(archiveId, state.turnNo);
  if (existing) throw new ServiceError(409, "本回合已结算，不可重复提交（防 SL）");

  const rng = createRng(monthSeed(archiveId, state.turnNo));
  let option: CompassOption;
  if (input.freeform) {
    // 意图解析层（docs/05 §5）：规则解析 → 低置信度拒绝并提示罗盘
    const intent = parseIntent(input.freeform, rng);
    if (intent.confidence < 0.4) {
      throw new ServiceError(422, `天道难以理解你的意图（${intent.restatedAction.slice(0, 20)}…），请从决策罗盘中选择，或换一种更明确的描述`);
    }
    const kindMap: Record<string, CompassOption["kind"]> = {
      cultivate: "biguan", seclude: "biguan", explore: "lishi", travel: "lishi",
      trade: "baiyi", bargain: "baiyi", craft: "baiyi", social: "daoyuan", attack: "lishi",
    };
    option = {
      idx: 0, kind: kindMap[intent.action] ?? "lishi",
      label: `【自由行动】${intent.restatedAction}（${input.freeform.slice(0, 30)}）`,
      payload: { type: "freeform", intent: intent.action, raw: input.freeform },
      freshnessMonths: 1,
    };
  } else {
    const optionIdx = input.optionIdx!;
    option = compass.find((o) => o.idx === optionIdx) ?? (() => { throw new ServiceError(400, `选项 ${optionIdx} 不存在`); })();
  }
  const outcome = settleAction(state, option, rng);

  // 道缘经营：社交往来结算（十一章三：成功往来 +5~15 亲密度）
  let relationDelta: { npcName: string; intimacy: number; tier: number } | undefined;
  if (option.kind === "daoyuan") {
    const relations = await store.getRelations(archiveId);
    const npcs = await store.getNpcs(archiveId);
    if (relations.length > 0) {
      const pick = relations[rng.int(0, relations.length)]!;
      const npc = npcs.find((n) => n.id === pick.npcId);
      const after = applyInteraction(pick, true, rng);
      const updated: StoredRelation[] = relations.map((r) =>
        r.npcId === pick.npcId ? { ...after, npcId: pick.npcId } : r,
      );
      await store.saveRelations(archiveId, updated);
      relationDelta = { npcName: npc?.name ?? "故人", intimacy: after.intimacy - pick.intimacy, tier: after.tier };
    }
  }

  // 应用结算（战斗失败的修为倒退在 resolvedCultivation 中统一处理）
  let nextCultivation = resolvedCultivation(state, outcome);
  let currencyReward = 0;

  // 天命推进：选中【天命】选项 → 应用阶段效果并推进（六章一）
  let destinyDelta: { storyline: string; stage: number; stageName: string; optionLabel: string; rewardNote: string; nextPhase: string } | undefined;
  if (option.destinyFlag) {
    const destiny = await store.getDestiny(archiveId);
    if (destiny && destiny.phase === "awaiting") {
      const script = stageScript(destiny.storylineKey, destiny.stage);
      // 罗盘 destiny 选项按 script.options 顺序注入，取位次
      const destinyIdxs = compass.filter((o) => o.destinyFlag).map((o) => o.idx);
      const choiceRank = destinyIdxs.indexOf(option.idx);
      const chosen = script.options[choiceRank >= 0 ? choiceRank : 0]!;
      for (const eff of chosen.effects) {
        if (eff.type === "exp" && eff.target === "cultivation") {
          nextCultivation = addCultivationExp(nextCultivation, eff.value ?? 0).state;
        } else if (eff.type === "currency") {
          currencyReward += eff.value ?? 0;
        }
      }
      const nextStage = destiny.stage >= 6 ? 6 : destiny.stage + 1;
      const nextPhase = destiny.stage >= 6 ? "finale" : "awaiting";
      await store.saveDestiny(archiveId, {
        ...destiny,
        stage: nextStage,
        phase: nextPhase,
        waitingYears: 0,
        choices: [...destiny.choices, { stage: destiny.stage, optionLabel: chosen.label, turnNo }],
        rewards: [...destiny.rewards, chosen.rewardNote],
      });
      destinyDelta = {
        storyline: destiny.storylineKey, stage: destiny.stage, stageName: script.name,
        optionLabel: chosen.label, rewardNote: chosen.rewardNote, nextPhase,
      };
    }
  }

  const updated: PlayerState = {
    ...state,
    cultivation: nextCultivation,
    currencies: currencyReward > 0
      ? { ...state.currencies, low: (state.currencies.low ?? 0) + currencyReward }
      : state.currencies,
  };

  const nar = await narrative.narrate({
    state, actionLabel: outcome.narrativeInput.actionLabel,
    cultivationGain: outcome.cultivationGain,
    levelsGained: outcome.levelsGained,
    combat: outcome.combatResult,
    relation: relationDelta,
    destiny: destinyDelta,
    nextMonth: state.gameMonth + 1,
  });

  await store.savePlayerState(archiveId, updated);
  await store.appendTurnRecord({
    archiveId, turnNo, seed: monthSeed(archiveId, turnNo),
    actionKind: outcome.actionKind, actionInput: { option: option.idx, label: option.label },
    engineDelta: { cultivationGain: outcome.cultivationGain, levelsGained: outcome.levelsGained, relation: relationDelta, destiny: destinyDelta },
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
      relation: relationDelta,
      destiny: destinyDelta,
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

  const compass = generateCompass(await compassCtxFor(archiveId, updated), createRng(monthSeed(archiveId, updated.turnNo)));
  await store.saveCompass(archiveId, updated.turnNo, compass);
  const destiny = await store.getDestiny(archiveId) ?? undefined;
  return {
    state: updated, realmName: realmOfLevel(updated.cultivation.level).name, compass,
    briefing: briefingFor(archiveSeedOf(archiveId), updated.turnNo), destiny,
  };
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
