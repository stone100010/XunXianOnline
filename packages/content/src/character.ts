import type { Domain, Race, SpiritRootGrade } from "@xunxian/shared";

// ── 种族（设定·二章一.2）──
export interface RaceDef {
  key: Race;
  name: string;
  bonus: string;
  trait: string;
}

export const RACES: readonly RaceDef[] = [
  { key: "human", name: "人族", bonus: "悟性+5%", trait: "适应性最强，各大势力均有分布" },
  { key: "yao",   name: "妖族", bonus: "根骨+10%", trait: "修炼到一定境界可化形，妖域有天然优势" },
  { key: "ling",  name: "灵族", bonus: "气运+5%", trait: "草木金石精粹化形，寿元绵长，族人稀少" },
] as const;

// ── 灵根品级（设定·二章一.4）──
export interface SpiritRootGradeDef {
  grade: SpiritRootGrade;
  name: string;
  elements: readonly [number, number]; // 系别数范围
  purity: readonly [number, number];   // 纯度范围
  speedModifier: number;               // 修炼速度修正
  note?: string;
}

export const SPIRIT_ROOT_GRADES: readonly SpiritRootGradeDef[] = [
  { grade: "fan",   name: "凡品", elements: [1, 2], purity: [0.1, 0.3], speedModifier: -0.2 },
  { grade: "zhong", name: "中品", elements: [2, 3], purity: [0.3, 0.5], speedModifier: 0 },
  { grade: "shang", name: "上品", elements: [1, 2], purity: [0.6, 0.8], speedModifier: +0.2 },
  { grade: "ji",    name: "极品", elements: [1, 1], purity: [0.9, 1.0], speedModifier: +0.5, note: "单系天灵根" },
  { grade: "yi",    name: "异灵根", elements: [1, 1], purity: [0.7, 0.9], speedModifier: +0.4, note: "雷冰风暗光，附带特殊效果" },
  { grade: "fei",   name: "废灵根", elements: [5, 5], purity: [0.05, 0.15], speedModifier: -0.5, note: "五系俱全纯度极低，天劫威力减半" },
] as const;

// ── 七大修真域（设定·二章一.5）──
export interface DomainDef {
  key: Domain;
  name: string;
  bonus: string;
  feature: string;
}

export const DOMAINS: readonly DomainDef[] = [
  { key: "zhongzhou", name: "中州圣城",   bonus: "气运+1",     feature: "宗门林立，信息最密集，竞争最激烈" },
  { key: "donghuang", name: "东荒妖域",   bonus: "根骨+10%",   feature: "妖族祖地，炼体功法众多" },
  { key: "nanming",   name: "南明离火域", bonus: "魅力+1",     feature: "炼器圣地，火系天堂，地下黑市发达" },
  { key: "xiji",      name: "西极玄冰域", bonus: "悟性+5%",    feature: "剑修圣地，阵法符箓传承悠久" },
  { key: "beiming",   name: "北冥瀚海",   bonus: "商贾嗅觉+5%", feature: "散修天堂，坊市密布，海外仙岛众多" },
  { key: "lingnan",   name: "岭南百越",   bonus: "根骨+5%",    feature: "奇虫异兽遍布，毒功驱兽发源地" },
  { key: "haiwai",    name: "海外仙岛",   bonus: "气运+5%",    feature: "散修联盟总部，上古遗府常现" },
] as const;

// ── 年龄段（设定·二章一.3）──
export interface AgeBandDef {
  range: readonly [number, number];
  name: string;
  trait: string;
}

export const AGE_BANDS: readonly AgeBandDef[] = [
  { range: [16, 25], name: "少年/青年", trait: "NPC 倾向宽容教导，拜师入宗等事件更易触发" },
  { range: [26, 45], name: "壮年",      trait: "初始修为略高，但『宗门新秀』类事件不可用" },
  { range: [46, 60], name: "中老年",    trait: "道心初始加成，根骨相关判定有衰减" },
  { range: [61, 99], name: "老年",      trait: "需搭配特定开局包，初始道心与气运较高，寿元紧迫" },
] as const;

// ── 先天道韵（设定·二章一.7）──
export interface DaoRhymeDef {
  key: string;
  name: string;
  effect: string;
  upgradePath: string;
}

export const DAO_RHYMES: readonly DaoRhymeDef[] = [
  { key: "mingcha",  name: "明察秋毫", effect: "识破幻术、探索秘境类判定+20%", upgradePath: "主动探索、破解阵法、鉴定灵物" },
  { key: "weibu",    name: "未卜先知", effect: "危机预警、机缘感应类判定+20%", upgradePath: "经历险境、验证直觉" },
  { key: "qiqiao",   name: "七窍玲珑", effect: "社交破冰、辨识谎言类判定+20%", upgradePath: "深度交谈、化解心结" },
  { key: "daoyin",   name: "道音灌耳", effect: "论道说服、谈判交涉类判定+20%", upgradePath: "公开讲道、收徒传法" },
  { key: "guomu",    name: "过目不忘", effect: "快速学习、典籍引用类判定+20%", upgradePath: "阅读典籍、抄录丹方" },
  { key: "wuxing",   name: "五行亲和", effect: "环境适应、抵抗属性压制类判定+20%", upgradePath: "极端环境修炼" },
  { key: "panshi",   name: "磐石之志", effect: "抗压修炼、抵抗心魔类判定+20%", upgradePath: "闭关苦修、拒绝诱惑" },
  { key: "tiangren", name: "天人感应", effect: "顿悟突破、机缘降临类判定+20%", upgradePath: "静坐冥思、观察天地" },
  { key: "leili",    name: "雷厉风行", effect: "行动速度、任务执行类判定+20%", upgradePath: "制定计划并执行、追踪目标" },
  { key: "qihuo",    name: "奇货可居", effect: "交易谈判、价值判断类判定+20%", upgradePath: "实际交易、鉴定灵物" },
] as const;
