# 05 · LLM 层设计（server/llm + 服务编排）

> 决策：先算后写（每回合一次主叙事调用）· 结构化 JSON+zod 校验+降级 · 分层记忆 · 设定模块化注入 · 全旗舰模型 · 供应商完全可配置（默认智谱 GLM 系旗舰）

---

## 1. 供应商抽象

```ts
interface LlmProvider {
  chat(req: { model, messages, responseFormat?, temperature, maxTokens, stream })
    : Promise<{ text, usage }>;
  streamChat(req): AsyncIterable<string>;
}
```

- OpenAI 兼容协议适配器（智谱 GLM / DeepSeek / GPT / Claude 适配层 / 任意兼容网关）。
- 配置存 `admin_settings`：`{ providers: [{key, baseUrl, apiKey(加密), defaultModel, models[], enabled}], routing: {scene → model}, promptVersions }`。
- 后台支持切换默认供应商、按场景路由（叙事/意图解析/简报润色/NPC 生成）、灰度比例。
- 每次调用写入 `llm_calls`（token/latency/status/估算成本）→ 成本看板。

## 2. Prompt 体系（模块化组装）

Prompt = **系统基座 + 按需设定模块 + 记忆包 + 本回合结构化输入 + 输出 schema 指令**。全部模板版本化入库（prompt_version），便于 A/B 与回溯。

### 2.1 系统基座（常驻，约 800 字）
角色定义（仙侠叙事者）、文风规范（仙侠意境+现代极简、禁 ASCII 拼框、emoji 视觉锚点沿用设定十九章）、铁律（**只表达给定事实，不得编造数值/物品/人物关系**；叙事量档位：日常 500-800 字 / 节点 1500 字）。

### 2.2 设定模块（按需注入，来自 ref_* 与 content 包切片）
| 模块 | 注入时机 |
|---|---|
| 世界观词表（域/势力/货币/境界名） | 常驻（精简 ~600 字） |
| 战斗规则与隐性反馈 7 档 | 战斗回合 |
| 当前主线阶段剧本上下文 | 主线推进回合 |
| 相关 NPC 卡（性格/称谓/态度/近期动态） | 有交互的回合 |
| 事件链当前节点剧本素材 | 事件回合 |
| 场景模块（坊市/秘境/渡劫各场景规范） | 对应场景 |

单次注入预算 ≤ 4K token，超出按相关性裁剪。

### 2.3 记忆包（memory/ 模块产出）
- 状态快照（结构化，引擎输出）
- 近 3 月纪要（已生成叙事的压缩版）
- 关键人物卡（道缘网内活跃者）
- 长线梗概（turn_summaries，每 12 月一条 + S/A 级事件卡）

## 3. 调用场景清单

| 场景 | 时机 | 输入 | 输出 schema（zod） |
|---|---|---|---|
| **主叙事** | 每回合行动结算后 | 引擎 delta + 记忆包 + 模块 | `TurnNarrative`（见 §4） |
| **意图解析** | 玩家自由输入时 | 输入文本 + 罗盘上下文 + 行动类型表 | `Intent {actionType, params, confidence, clarify?}` |
| **简报润色** | 每月初（与主叙事可合并为一次调用以省成本；分离用于 S 级回合） | 结构化动态列表 | `Briefing {sections[]}` |
| **NPC 生成** | 池中无匹配时 | 需求标签 + 池内已有摘要（避免重复） | `NpcProfile`（完整属性，入库校验域） |
| **主线节点叙事** | S/A 级节点 | 剧本节点素材 + 抉择记录 | `SceneNarrative`（长文+分镜提示） |
| **终章回顾** | 终幕 | 五维数据 | `FinaleReview {sections, suggestedTitles[3]}` |

主叙事与简报默认**合并单次调用**（决策：每回合 1 次）；S 级回合拆流式多段。

## 4. 主叙事输出契约（TurnNarrative）

```ts
{
  narrative: string,            // 本月纪要正文（含隐性反馈文案改写）
  sceneBeats?: [{ kind, text, effectHint }],  // 演出分镜提示（骰子定格/震屏/飘字位置）
  optionLabels: string[],       // 罗盘选项润色文案（与引擎生成的选项一一对应）
  briefing?: { sections: [{ title, items[] }] }, // 天机简报润色
  dialogues?: [{ npc, line }],  // 关键对话
  moodTags: string[]            // 供前端选主题动效
}
```

约束：所有数值/物品/关系变化必须来自引擎 delta，LLM 不得增删；校验器比对 delta 中出现的关键实体与叙事提及的一致性（宽松校验：禁提及 delta 外的具名物品获取）。

失败链路：zod fail → 携带错误重试 1 次 → **模板降级**（引擎用 ref_narrative_styles 拼装保底文本，回合不中断，标记 degraded 供看板监控）。

## 5. 意图解析层（自由输入）

```
玩家文本 → Intent 解析（含行动类型枚举：修炼/探索/交易/砍价/拜访/炼制/闭关/赶路/攻击/其他）
  confidence ≥ 0.7 & 类型合法 → 引擎 actions 结算（custom 参数）
  0.4 ≤ c < 0.7 → 澄清追问一次（给 2-3 个候选解读按钮）
  c < 0.4 或两次失败 → 建议就近罗盘选项
"其他"合理描述 → freeform 结算：LLM 叙事主导 + 保守数值（小额经验/心情/关系微调上限表）
```

## 6. 流式体验

- 主叙事 SSE 流式输出（打字机）；`turn/start` 引擎结果先落库（02 号文档 §3.1）。
- 前端演出编排：先播引擎演出（骰子动画/数值变更），叙事文本流式跟随。

## 7. 成本与质量监控

- 全旗舰模型（决策）；成本看板按 存档/场景/天 汇总 token 与估算费用（09 号文档）。
- 质量抽检：后台"叙事评审"队列（低分/降级/超长样本人工评分），prompt 迭代依据。
- Prompt 版本管理：每次变更入库留痕，llm_calls 绑定版本，可对比版本间降级率/成本/时长。
