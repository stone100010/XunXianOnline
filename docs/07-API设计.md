# 07 · API 设计（Next.js Route Handlers）

> 统一约定：请求/响应体均由 `packages/shared` 的 zod schema 定义；鉴权依赖 httpOnly cookie 中的设备 ID（`did`）；管理接口走 `/api/admin/*` + 管理员会话。错误格式 `{ error: { code, message } }`。

---

## 1. 玩家端接口

### 设备与存档

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/device` | 注册/刷新设备 ID（返回 did cookie） |
| GET | `/api/archives` | 存档列表（3 槽：槽位、角色摘要、天命主线、进度） |
| POST | `/api/archives` | 新建存档（入参：角色创建全量选择；出参：archiveId + 初始状态视图 + 初始 NPC/罗盘） |
| GET | `/api/archives/:id` | 存档详情（当前回合视图模型） |
| DELETE | `/api/archives/:id` | 删除存档（二次确认码） |
| POST | `/api/archives/restore` | 道果码恢复：`{code}` → 重绑定到当前设备 |

### 回合（核心）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/archives/:id/turn` | 本月开局视图：状态总览 + 简报 + 罗盘 15 项 + 未竟仙途 |
| POST | `/api/archives/:id/turn/action` | 提交行动 `{optionIdx}` 或 `{freeformText}` → 同步返回结算视图（引擎 delta + 叙事；LLM 流式时返回 `{turnRecordId}` 后走 SSE） |
| GET | `/api/archives/:id/turn/:turnNo/narrative` | SSE 流式获取叙事（S 级回合两段式） |
| POST | `/api/archives/:id/turn/next` | 进入下月（世界演化 + 新罗盘生成） |
| POST | `/api/archives/:id/intent` | 独立意图解析（可选预检，返回澄清候选） |

幂等：action/next 请求携带客户端 `turnNo`，服务端不匹配即 409。

### 信息面板

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/archives/:id/inventory` | 背包（分页/分类） |
| GET | `/api/archives/:id/npcs` | 道缘网（道友/熟识/敌对/宿敌，含道友之能状态） |
| GET | `/api/archives/:id/npcs/:npcId` | NPC 详情（公开信息 + 态度矩阵） |
| GET | `/api/archives/:id/map?level=domain\|region\|place` | 三层灵图数据 |
| GET | `/api/archives/:id/market?place=` | 坊市货架（正市/黑市/秘库） |
| POST | `/api/archives/:id/market/trade` | 交易（买/卖/砍价/易物，走意图或结构化参数） |
| GET | `/api/archives/:id/history?from=&to=` | 历史回合回看（只读） |
| GET | `/api/archives/:id/destiny` | 天命主线进度与回顾数据 |

### 特殊流程

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/archives/:id/breakthrough` | 发起突破/渡劫（条件校验→S 级演出数据） |
| POST | `/api/archives/:id/finale` | 终幕抉择与封号提交 `{choice, title}` |
| POST | `/api/archives/:id/inherit` | 道统传承（选择继承者） |
| POST | `/api/archives/:id/reincarnate` | 轮回转世 `{mode: reset|transmit}` |

## 2. 管理后台接口（/api/admin/*，管理员会话中间件）

- `POST /api/admin/auth/login`：管理员登录。
- CRUD 通用模式：`GET/POST/PATCH/DELETE /api/admin/refs/:table`（03 号文档 §4 全部静态表；data 字段按各表 zod schema 校验；变更留 audit log）。
- `GET /api/admin/stats/*`：仪表盘聚合（见 09 号文档：漏斗/经济/战斗/主线/成本/降级率）。
- `GET/PUT /api/admin/settings/llm`：供应商与模型路由配置。
- `GET /api/admin/players`：玩家列表与存档检索（客服支持：查看只读存档快照）。
- `POST /api/admin/tools/replay`：回合回放（输入道果码+回合号，返回重放对比结果）。
- `GET /api/admin/prompts` / `PUT /api/admin/prompts/:id`：prompt 版本管理。

## 3. 典型时序

**常规月回合**
```
GET /turn → UI 渲染开局页
POST /turn/action {optionIdx: 7}
  ├─ 200 {settlement}（含演出分镜、delta、叙事）   // 常规
  └─ 200 {turnRecordId} + GET /turn/:no/narrative(SSE)  // S 级
POST /turn/next → 演化 + 新月开局
```

**自由输入**
```
POST /turn/action {freeformText}
  ├─ 引擎直接结算（意图明确）
  ├─ 200 {clarify: {candidates[]}} → 玩家点选 → 再 POST
  └─ 200 {freeformSettlement}（保守数值 + LLM 叙事）
```

## 4. 限流与配额

| 接口 | 限制 |
|---|---|
| turn/action、turn/next | 30 次/分钟/设备（正常游玩远低于此） |
| freeform 行动 | 20 次/分钟（LLM 成本保护） |
| archives/restore | 5 次/小时（防爆破道果码） |
| admin/* | IP + 会话双维度限流 |

## 5. 版本与兼容

- API 契约由 `packages/shared` schema 单一来源，前端用 openapi 类型生成（可选 zod-to-openapi 导出文档）。
- 设定版本：archive 绑定 `settings_version`；静态表热更不回写进行中的存档（数值快照机制，见 03 号文档 §4）。
