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
        }),
        signal: AbortSignal.timeout(45_000),
      });
      if (!res.ok) throw new Error(`LLM ${key} HTTP ${res.status}`);
      const json = (await res.json()) as {
        choices: { message: { content: string } }[];
        usage?: { prompt_tokens: number; completion_tokens: number };
      };
      return {
        text: json.choices[0]?.message?.content ?? "",
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

  async narrate(input: NarrativeInput): Promise<NarrativeOutput> {
    const fallback = templateNarrative(input);
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
