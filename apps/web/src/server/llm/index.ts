// LLM 供应商抽象（docs/05 §1）：OpenAI 兼容协议 + 可配置 + 失败模板降级
export interface LlmChatRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmChatResponse {
  text: string;
  provider: string;
  model: string;
  usage: { promptTokens: number; completionTokens: number };
}

export interface LlmProvider {
  key: string;
  chat(req: LlmChatRequest): Promise<LlmChatResponse>;
}

/** OpenAI 兼容适配器（智谱 GLM / DeepSeek / GPT / 任意兼容网关） */
export function openAiCompatible(key: string, baseUrl: string, apiKey: string, model: string): LlmProvider {
  return {
    key,
    async chat(req) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
          max_tokens: req.maxTokens ?? 2000,
          temperature: req.temperature ?? 0.8,
          // GLM-4.5+/5.x 为推理模型：叙事场景禁用思考链（不兼容网关会忽略该字段）
          thinking: { type: "disabled" },
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new Error(`LLM ${key} HTTP ${res.status}`);
      const json = (await res.json()) as {
        choices: { message: { content: string; reasoning_content?: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
      };
      const msg = json.choices[0]?.message;
      const text = msg?.content?.trim() || msg?.reasoning_content?.trim() || "";
      return {
        text,
        provider: key,
        model,
        usage: {
          promptTokens: json.usage?.prompt_tokens ?? 0,
          completionTokens: json.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}

// ── 叙事服务：先算后写（docs/05 §3-4）──
// LLM 可用时生成仙侠叙事；不可用/失败时模板降级（引擎数据拼装，回合永不中断）
import type { CombatResult, PlayerState } from "@xunxian/shared";
import { HIDDEN_FEEDBACK_TEXT } from "@xunxian/engine";

export interface NarrativeInput {
  state: PlayerState;
  actionLabel: string;
  cultivationGain: number;
  levelsGained: number;
  combat?: CombatResult;
  relation?: { npcName: string; intimacy: number; tier: number };
  destiny?: { storyline: string; stage: number; stageName: string; optionLabel: string; rewardNote: string; nextPhase: string };
  realm?: { 名称: string; 游历步骤: string[]; 收获: { 修为: number; 灵石: number; 物品: string[]; 传承: string[] } };
  art?: { 技艺: string; 经验增长: number; 升级层数: number; 售卖收入: number };
  karma?: { 事件: string; 抉择方向: string; 结果注记: string; 收益: { 修为: number; 灵石: number; 物品?: string } };
  currencyDelta?: Partial<Record<string, number>>;
  nextMonth: number;
}

export interface NarrativeOutput {
  narrative: string;
  degraded: boolean;
  modelMeta: unknown;
}

const SYSTEM_PROMPT = `你是仙侠叙事者，为月令回合制修仙模拟器撰写叙事。
铁律：
1. 只表达给定的事实（数值/物品/人物关系），绝不可编造新的事实。
2. 文风：仙侠意境+现代极简，第二人称"你"。
3. 日常回合 500-800 字，关键节点 1500 字。
4. 禁止 ASCII 拼框，可用少量 emoji 作视觉锚点。`;

export class NarrativeService {
  constructor(private provider: LlmProvider | null) {}

  async narrate(input: NarrativeInput): Promise<NarrativeOutput> {    const fallback = templateNarrative(input);
    if (!this.provider) return { narrative: fallback, degraded: true, modelMeta: { provider: "template" } };
    try {
      const res = await this.provider.chat({
        system: SYSTEM_PROMPT,
        user: JSON.stringify(buildFacts(input)),
        maxTokens: 1500,
      });
      const text = res.text.trim();
      if (!text) throw new Error("empty");
      return {
        narrative: text,
        degraded: false,
        modelMeta: { provider: res.provider, model: res.model, usage: res.usage },
      };
    } catch {
      return { narrative: fallback, degraded: true, modelMeta: { provider: "template", degraded: true } };
    }
  }
}

/** 结构化事实包（LLM 只做表达，不做决策） */
function buildFacts(input: NarrativeInput) {
  return {
    人物: { 姓名: input.state.name, 境界等级: input.state.cultivation.level, 骨龄: input.state.age },
    时间: `天玄历第${input.state.gameYear}年${input.state.gameMonth}月`,
    本月行动: input.actionLabel,
    修为增长: input.cultivationGain,
    升级数: input.levelsGained,
    战斗: input.combat ? {
      对手: input.combat.foe.name,
      结果: input.combat.outcome === "win" ? "胜" : "败",
      命运骰子: input.combat.dice.face,
      隐性氛围: HIDDEN_FEEDBACK_TEXT[input.combat.hiddenFeedback],
      惩罚: input.combat.punishApplied,
    } : null,
    道缘变动: input.relation ? {
      对象: input.relation.npcName,
      亲密度变化: input.relation.intimacy > 0 ? `+${input.relation.intimacy}` : String(input.relation.intimacy),
      关系层级: ["陌路", "一面之缘", "熟识", "道友", "心腹/道侣"][input.relation.tier],
    } : null,
    因缘际会: input.karma ? {
      事件: input.karma.事件, 抉择: input.karma.抉择方向,
      结果: input.karma.结果注记, 收益: input.karma.收益,
    } : null,
    百艺经营: input.art ? {
      技艺: input.art.技艺, 经验增长: input.art.经验增长,
      升级层数: input.art.升级层数, 售卖收入: input.art.售卖收入,
    } : null,
    秘境游历: input.realm ? {
      名称: input.realm.名称,
      步骤: input.realm.游历步骤,
      收获: input.realm.收获,
    } : null,
    天命推进: input.destiny ? {
      主线: input.destiny.storyline,
      完成阶段: `第${input.destiny.stage}阶「${input.destiny.stageName}」`,
      抉择: input.destiny.optionLabel,
      获得奖励: input.destiny.rewardNote,
    } : null,
  };
}

/** 模板降级叙事（引擎数据拼装的保底文本） */
export function templateNarrative(input: NarrativeInput): string {
  const { state, actionLabel, cultivationGain, levelsGained, combat } = input;
  const lines: string[] = [];
  lines.push(`🌙 天玄历·${state.gameYear}年${state.gameMonth}月`);
  lines.push(`你于${state.location.domain}静修一月。本月所行：${actionLabel}。`);
  if (cultivationGain > 0) {
    lines.push(`丹田真元缓缓流转，修为精进 +${cultivationGain}。`);
  }
  if (levelsGained > 0) {
    lines.push(`✨ 气机贯通，连破 ${levelsGained} 层！`);
  }
  if (combat) {
    const c = combat;
    lines.push(`⚔️ 与 ${c.foe.name}（战力${c.foePower}）一场${c.outcome === "win" ? "激战……你胜了" : "恶战……你败了"}。`);
    lines.push(`${HIDDEN_FEEDBACK_TEXT[c.hiddenFeedback]}`);
    lines.push(`🎲 命运骰子定于：${c.dice.face}。`);
    if (c.outcome === "lose" && c.punishApplied) {
      lines.push(`💀 修为倒退 ${c.punishApplied.realmLoss} 级，功法遗忘 ${c.punishApplied.techniqueForget} 层。`);
    }
  }
  lines.push(`月光如水，新的机缘在下月等你。`);
  return lines.join("\n");
}

// ── 环境装配：LLM_BASE_URL/LLM_API_KEY/LLM_MODEL → 默认供应商（智谱 GLM 等）──
export function buildProviderFromEnv(): LlmProvider | null {
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !apiKey || !model) {
    console.warn("[llm] 未配置 LLM 环境变量，叙事使用模板降级");
    return null;
  }
  const key = process.env.LLM_PROVIDER_KEY ?? "default";
  return openAiCompatible(key, baseUrl, apiKey, model);
}
