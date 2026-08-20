// FinaleService：天命终章（设定·六章五）——封号命名 + 五维回顾 + 结局叙事
import { realmOfLevel } from "@xunxian/engine";
import { storylineByKey } from "@xunxian/content";
import type { PlayerState } from "@xunxian/shared";
import { store } from "../store.js";
import { ServiceError } from "./archiveService.js";
import { buildProviderFromEnv, type LlmProvider } from "../llm/index.js";

const provider: LlmProvider | null = buildProviderFromEnv();

export interface FinaleReview {
  title: string;
  overview: { storylineName: string; years: number; finalRealm: string; finalChoice: string };
  choices: { stage: number; optionLabel: string }[];
  rewards: string[];
  relations: { name: string; tier: number }[];
  ending: string; // LLM 结局叙事（失败时模板）
}

function templateEnding(state: PlayerState, storylineName: string, choice: string): string {
  return [
    `天玄历悠悠，${state.name}的仙途终章落下帷幕。`,
    `天命【${storylineName}】历六阶而圆满，终幕抉择：${choice}。`,
    `最终境界：${realmOfLevel(state.cultivation.level).name}。`,
    `此界传颂其名，后辈修士仰之弥高。仙途有尽，传说无穷。`,
  ].join("\n");
}

export async function finale(
  archiveId: string, deviceId: string, input: { title: string },
): Promise<FinaleReview> {
  const archive = await store.findArchive(archiveId);
  if (!archive) throw new ServiceError(404, "存档不存在");
  if (archive.deviceId !== deviceId) throw new ServiceError(403, "无权访问该存档");
  const state = await store.getPlayerState(archiveId);
  const destiny = await store.getDestiny(archiveId);
  if (!state || !destiny) throw new ServiceError(500, "存档状态缺失");
  if (destiny.phase !== "finale") throw new ServiceError(422, "天命终幕尚未达成（需完成六阶）");

  // 封号校验：2-8 字中文风格
  const title = input.title.trim();
  if (title.length < 2 || title.length > 8) throw new ServiceError(422, "封号须为 2-8 字");

  const lastChoice = destiny.choices[destiny.choices.length - 1]?.optionLabel ?? "顺应本心";
  const storylineName = storylineByKey(destiny.storylineKey).name;

  // 道缘概览：好感最高的 5 位
  const [npcs, relations] = await Promise.all([store.getNpcs(archiveId), store.getRelations(archiveId)]);
  const topRelations = relations
    .map((r) => ({ r, npc: npcs.find((n) => n.id === r.npcId) }))
    .filter((x): x is { r: typeof x.r; npc: NonNullable<typeof x.npc> } => x.npc !== undefined)
    .sort((a, b) => b.r.intimacy - a.r.intimacy)
    .slice(0, 5)
    .map(({ r, npc }) => ({ name: npc.name, tier: r.tier }));

  // 结局叙事：LLM 优先，模板兜底
  const facts = {
    姓名: state.name, 封号: title, 天命: storylineName,
    历时年数: Math.floor(state.turnNo / 12) + 1,
    最终境界: realmOfLevel(state.cultivation.level).name,
    终幕抉择: lastChoice,
    关键抉择: destiny.choices.map((c) => `第${c.stage}阶：${c.optionLabel.slice(0, 30)}`),
    天命奖励: destiny.rewards,
    道缘: topRelations.map((r) => r.name),
  };
  let ending = templateEnding(state, storylineName, lastChoice);
  if (provider) {
    try {
      const res = await provider.chat({
        system: "你是仙侠叙事者。基于给定的全部事实，为修士的一生撰写终章结局叙事：荡气回肠、首尾呼应，300-500字。只表达给定事实。",
        user: JSON.stringify(facts), maxTokens: 900, temperature: 0.9,
      });
      if (res.text.trim()) ending = res.text.trim();
    } catch { /* 模板兜底 */ }
  }

  const review: FinaleReview = {
    title,
    overview: {
      storylineName,
      years: Math.floor(state.turnNo / 12) + 1,
      finalRealm: realmOfLevel(state.cultivation.level).name,
      finalChoice: lastChoice,
    },
    choices: destiny.choices.map((c) => ({ stage: c.stage, optionLabel: c.optionLabel })),
    rewards: destiny.rewards,
    relations: topRelations,
    ending,
  };

  // 封号记入 rewards 首位（DestinyProgress.title 字段随 schema 扩展迁移）
  await store.saveDestiny(archiveId, { ...destiny, phase: "completed", rewards: [`天命封号·${title}`, ...destiny.rewards] });
  await store.updateArchiveStatus(archiveId, "ended_ascend");
  return review;
}
