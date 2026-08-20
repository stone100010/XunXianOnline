// ── 开局资产包（设定·二章一.6，10 选 1，各绑一条天命主线）──
export interface StartPackDef {
  id: number;
  key: string;
  name: string;
  assets: string;              // 初始资产描述
  initialRealmLevel: number;   // 初始修为等级（凡人境炼体期=1，炼气初期=11）
  initialCurrencies: { low: number };
  social: string;              // 初始社交
  destinyKey: string;          // 绑定天命主线
  destinyName: string;
  destinySummary: string;
}

export const START_PACKS: readonly StartPackDef[] = [
  { id: 1, key: "daoti",   name: "天生道体",   assets: "下品储物袋+凡器长剑", initialRealmLevel: 1,  initialCurrencies: { low: 10 },  social: "恩师1人（好感40~60）",        destinyKey: "shengti",  destinyName: "圣体之路",       destinySummary: "解开荒古圣体封印，成为万古战仙" },
  { id: 2, key: "fangshi", name: "坊市学徒",   assets: "小型储物袋+中品凡器", initialRealmLevel: 1,  initialCurrencies: { low: 50 },  social: "坊市商贩数人（20~40）",       destinyKey: "caifu",    destinyName: "财可通神",       destinySummary: "建立通天商会，以财力撬动修仙界" },
  { id: 3, key: "xuemail", name: "没落血脉",   assets: "家族偏院+下品法器",   initialRealmLevel: 1,  initialCurrencies: { low: 30 },  social: "族人若干（好感10~30）",       destinyKey: "xuemail",  destinyName: "血脉复兴",       destinySummary: "解开家族诅咒，重振苍梧古族" },
  { id: 4, key: "yigu",    name: "遗孤散修",   assets: "残破洞府（临时）+下品法器", initialRealmLevel: 11, initialCurrencies: { low: 15 }, social: "散修旧识三五位（好感5~20）", destinyKey: "nijing",   destinyName: "逆境求生",       destinySummary: "以散修之身打破弱肉强食铁律" },
  { id: 5, key: "zhuanshi",name: "转世大能",   assets: "凡人小屋+凡器短剑",   initialRealmLevel: 1,  initialCurrencies: { low: 5 },   social: "无任何故交",                  destinyKey: "zaizheng", destinyName: "再证大道",       destinySummary: "找回前世遗产，开辟超越前世的道途" },
  { id: 6, key: "tongzi",  name: "佛道童子",   assets: "随身经卷数册+青布僧袍/道袍", initialRealmLevel: 1, initialCurrencies: { low: 8 }, social: "师门旧识数人（好感30~50）",  destinyKey: "hongchen", destinyName: "红尘问道",       destinySummary: "入世体悟众生百态" },
  { id: 7, key: "danjia",  name: "炼丹世家",   assets: "丹炉一尊+下品丹药十瓶", initialRealmLevel: 1, initialCurrencies: { low: 80 },  social: "丹道同行数家（好感20~35）",   destinyKey: "dandao",   destinyName: "丹道至尊",       destinySummary: "炼制九转金丹" },
  { id: 8, key: "zayong",  name: "宗门杂役",   assets: "宗门杂役房一间+旧法器", initialRealmLevel: 11, initialCurrencies: { low: 10 },  social: "父亲旧识二三人（好感20~40）", destinyKey: "zongmen",  destinyName: "宗门逆袭",       destinySummary: "从杂役到圣子，改革腐朽体制" },
  { id: 9, key: "zhujian", name: "铸剑山庄",   assets: "铸造工坊一间+炼器炉一尊", initialRealmLevel: 1, initialCurrencies: { low: 50 }, social: "炼器同行三五家（好感10~25）", destinyKey: "zhujian",  destinyName: "百兵之祖",       destinySummary: "锻造绝世神兵" },
  { id: 10, key: "daqicheng", name: "大器晚成", assets: "凡人小屋+基础功法残卷", initialRealmLevel: 1, initialCurrencies: { low: 3 }, social: "同病相怜散修数人（好感15~30）", destinyKey: "woming", destinyName: "我命由我不由天", destinySummary: "自创功法，撕碎废材标签" },
] as const;

export function startPackByKey(key: string): StartPackDef {
  const p = START_PACKS.find((x) => x.key === key);
  if (!p) throw new Error(`未知开局包: ${key}`);
  return p;
}
