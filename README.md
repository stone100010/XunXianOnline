# 寻仙 Online · 玄幻修仙模拟器

> 单人月令回合制 · 开放世界修仙模拟器 ｜ 天玄大陆 ｜ 基于《玄幻修仙模拟器提示词》V8.1.3 设定
> 手机竖屏优先的响应式 Web 手游 ｜ Next.js 全栈 · 规则引擎 + LLM 混合叙事

**即刻启航！**

## 游戏简介

从底层起步，体验"废材逆袭""以凡伐仙"的仙侠叙事。1 回合 = 1 个月，每年 12 回合：1-3 月天命之召、6-7 月因缘际会。100 级境界（凡人→渡劫大乘）、五维道基、命运骰子斗法判定、10 条天命主线、NPC 自主演化的开放世界。无固定终点：渡劫飞升、开宗立派、道统传承、轮回转世，皆由你抉择。

## 架构总纲

**规则引擎做骨架，LLM 做血肉** —— 引擎先算出全部结构化结果（确定性、可单测、可回放），LLM 只负责叙事表达（"先算后写"），数值永远可控，叙事永远鲜活。

```
┌ apps/web ──────────── Next.js 应用（玩家端 + /admin 管理后台 + API Routes）
├ packages/shared ───── 全栈共享 zod schema 与类型（API 契约、游戏状态）
├ packages/engine ───── 规则引擎（纯函数、零 IO、确定性种子随机）
│    rng / character / growth / combat / breakthrough / compass / world / events
├ packages/content ──── 静态内容包（种族/灵根/开局包/物品/功法/主线剧本 JSON 基线）
└ docs/ ─────────────── 规划设计与技术方案（11 份）
```

## 文档导航

| 文档 | 内容 |
|---|---|
| [00-总览](docs/00-总览.md) | 定位、决策记录（11 轮讨论结论）、风险清单 |
| [01-产品设计](docs/01-产品设计.md) | 设定→系统完整映射与 UI/演出设计 |
| [02-技术架构](docs/02-技术架构.md) | Monorepo 结构、回合处理管线、降级链路 |
| [03-数据模型](docs/03-数据模型.md) | Drizzle schema、道果码规范 |
| [04-规则引擎设计](docs/04-规则引擎设计.md) | engine 模块与全部公式实现规格 |
| [05-LLM层设计](docs/05-LLM层设计.md) | Prompt 体系、结构化输出、供应商抽象 |
| [06-主线剧本规范](docs/06-主线剧本规范.md) | 10 条主线剧本 JSON Schema |
| [07-API设计](docs/07-API设计.md) | API 路由清单与契约 |
| [08-前端与移动端规范](docs/08-前端与移动端规范.md) | 页面结构、演出动效、竖屏适配 |
| [09-管理后台与数据分析](docs/09-管理后台与数据分析.md) | 数值管理、运营仪表盘、埋点 |
| [10-部署与交付计划](docs/10-部署与交付计划.md) | 部署方案、开发顺序、验收清单 |
| [设定文档](docs/设定/玄幻修仙模拟器提示词-V8.1.3.md) | 原版 V8.1.3 设定（唯一设定来源） |

## 技术栈

Next.js (App Router) · TypeScript · PostgreSQL + Drizzle ORM · Tailwind CSS + shadcn/ui + Framer Motion · TanStack Query + Zustand · Vitest · pnpm Monorepo · Vercel 部署

## 快速开始

```bash
pnpm install          # 安装依赖
pnpm dev              # 启动开发服务器（apps/web）
pnpm test             # 运行全部测试（规则引擎单测）
pnpm build            # 构建
```

环境变量见 `apps/web/.env.example`。

## 开发路线（详见 docs/10）

P1 地基 → P2 规则引擎 → P3 核心循环 → P4 LLM 层 → P5 主线内容 → P6 子系统 → P7 管理后台 → P8 打磨 → P9 交付

**当前进度**：P1/P2 完成（rng/combat/growth/breakthrough/compass/character/world/events/market/npc 十大引擎模块，76+ 单测）；P3 核心循环可玩（建角→罗盘→行动→结算→下月全流程，含道果码存档/恢复、防 SL）；P4 LLM 层骨架就绪（供应商抽象+模板降级，接 key 即启用真实叙事）；P6 坊市/背包/天机简报/自由输入已上线。

```bash
pnpm install && pnpm dev   # http://localhost:3000 即可开玩
```

## License

MIT
