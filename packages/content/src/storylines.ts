// ── 十条天命主线骨架（设定·六章四）──
// 每条 6 阶段；完整节点图（ChainNode）按 docs/06 规范逐步扩充，入库 ref_storylines。
export interface StorylineSeed {
  key: string;
  name: string;
  bindPackKey: string;
  tone: string;                 // 终章基调
  stages: readonly {            // 阶段名 + realmGate（修为区间）+ 奖励预览
    name: string;
    realmGate: readonly [number, number];
    reward: string;
  }[];
}

export const STORYLINE_SEEDS: readonly StorylineSeed[] = [
  {
    key: "shengti", name: "圣体之路", bindPackKey: "daoti", tone: "热血战体，万古长明",
    stages: [
      { name: "封印松动", realmGate: [1, 10], reward: "觉醒《星辰锻体术》" },
      { name: "星辰初淬", realmGate: [11, 20], reward: "天命神通·灵石护盾" },
      { name: "圣体初劫", realmGate: [21, 40], reward: "星辉战甲" },
      { name: "不灭战体", realmGate: [41, 60], reward: "不灭战体/万法道体（分支）" },
      { name: "因果清算", realmGate: [61, 80], reward: "法则碎片" },
      { name: "星空试炼", realmGate: [81, 95], reward: "星空领域+道统信物" },
    ],
  },
  {
    key: "caifu", name: "财可通神", bindPackKey: "fangshi", tone: "商海浮沉，道在人心",
    stages: [
      { name: "第一桶金", realmGate: [1, 10], reward: "商道心得" },
      { name: "商会雏形", realmGate: [11, 20], reward: "天命神通·灵石护盾" },
      { name: "垄断之路", realmGate: [21, 40], reward: "玲珑商体" },
      { name: "金钱与道义", realmGate: [41, 60], reward: "商脉法则碎片" },
      { name: "富可敌国", realmGate: [61, 80], reward: "财富领域" },
      { name: "财神抉择", realmGate: [81, 95], reward: "道统信物·通天令" },
    ],
  },
  {
    key: "xuemail", name: "血脉复兴", bindPackKey: "xuemail", tone: "家族恩义，血脉长歌",
    stages: [
      { name: "族比扬名", realmGate: [1, 10], reward: "族中资源倾斜" },
      { name: "诅咒溯源", realmGate: [11, 20], reward: "血脉共鸣" },
      { name: "古血觉醒", realmGate: [21, 40], reward: "苍梧古血（修炼+30%，木系翻倍）" },
      { name: "复仇或和解", realmGate: [41, 60], reward: "血脉神通（分支）" },
      { name: "重建圣地", realmGate: [61, 80], reward: "圣地领域" },
      { name: "先祖之约", realmGate: [81, 95], reward: "道统信物·苍梧印" },
    ],
  },
  {
    key: "nijing", name: "逆境求生", bindPackKey: "yigu", tone: "孤身逆旅，散修风骨",
    stages: [
      { name: "师父遗泽", realmGate: [1, 10], reward: "师父遗物与线索" },
      { name: "散修尊严", realmGate: [11, 20], reward: "天命神通·困兽之斗" },
      { name: "逍遥体觉醒", realmGate: [21, 40], reward: "逍遥体" },
      { name: "散修逆袭", realmGate: [41, 60], reward: "散修盟声望" },
      { name: "天下无派", realmGate: [61, 80], reward: "自由法则碎片" },
      { name: "逍遥终章", realmGate: [81, 95], reward: "道统信物·逍遥符" },
    ],
  },
  {
    key: "zaizheng", name: "再证大道", bindPackKey: "zhuanshi", tone: "前世今生，道心拷问",
    stages: [
      { name: "魔功诱惑", realmGate: [1, 10], reward: "前世记忆碎片" },
      { name: "前世遗产", realmGate: [11, 20], reward: "天命神通·前世威压" },
      { name: "轮回体觉醒", realmGate: [21, 40], reward: "轮回体" },
      { name: "斩断因果", realmGate: [41, 60], reward: "因果法则碎片" },
      { name: "超越前世", realmGate: [61, 80], reward: "轮回领域" },
      { name: "大道之约", realmGate: [81, 95], reward: "道统信物·轮回镜" },
    ],
  },
  {
    key: "hongchen", name: "红尘问道", bindPackKey: "tongzi", tone: "慈悲入世，红尘炼心",
    stages: [
      { name: "入世第一课", realmGate: [1, 10], reward: "经卷要义" },
      { name: "身份抉择", realmGate: [11, 20], reward: "天命神通·佛光普照" },
      { name: "金身或道心", realmGate: [21, 40], reward: "功德金身/道心通明（分支）" },
      { name: "立教传法", realmGate: [41, 60], reward: "传法神通" },
      { name: "大道之争", realmGate: [61, 80], reward: "愿力法则碎片" },
      { name: "普度终章", realmGate: [81, 95], reward: "道统信物·度世钵" },
    ],
  },
  {
    key: "dandao", name: "丹道至尊", bindPackKey: "danjia", tone: "丹火淬心，大道至纯",
    stages: [
      { name: "父亲试炼", realmGate: [1, 10], reward: "家传丹方" },
      { name: "丹盟挑战", realmGate: [11, 20], reward: "天命神通·丹火护体" },
      { name: "丹灵体觉醒", realmGate: [21, 40], reward: "丹灵体" },
      { name: "丹道至尊", realmGate: [41, 60], reward: "丹道法则碎片" },
      { name: "九转金丹", realmGate: [61, 80], reward: "九转金丹方" },
      { name: "金丹终章", realmGate: [81, 95], reward: "道统信物·九转炉" },
    ],
  },
  {
    key: "zongmen", name: "宗门逆袭", bindPackKey: "zayong", tone: "体制沉浮，理想不灭",
    stages: [
      { name: "黑玉之谜", realmGate: [1, 10], reward: "黑玉线索" },
      { name: "外门大比", realmGate: [11, 20], reward: "天命神通·逆境爆发" },
      { name: "判官或师表", realmGate: [21, 40], reward: "铁面判官/万世师表（分支）" },
      { name: "宗门政变", realmGate: [41, 60], reward: "权柄法则碎片" },
      { name: "道统之争", realmGate: [61, 80], reward: "宗门领域" },
      { name: "秩序终章", realmGate: [81, 95], reward: "道统信物·太虚令" },
    ],
  },
  {
    key: "zhujian", name: "百兵之祖", bindPackKey: "zhujian", tone: "炉火千年，剑心通明",
    stages: [
      { name: "神火之秘", realmGate: [1, 10], reward: "神火线索" },
      { name: "家族存亡", realmGate: [11, 20], reward: "天命神通·神兵共鸣" },
      { name: "兵主之体觉醒", realmGate: [21, 40], reward: "兵主之体" },
      { name: "神兵出世", realmGate: [41, 60], reward: "本命神兵" },
      { name: "神兵择主", realmGate: [61, 80], reward: "兵道法则碎片" },
      { name: "镇族终章", realmGate: [81, 95], reward: "道统信物·铸魂锤" },
    ],
  },
  {
    key: "woming", name: "我命由我不由天", bindPackKey: "daqicheng", tone: "逆天改命，废材长歌",
    stages: [
      { name: "筑基丹骗局", realmGate: [1, 10], reward: "骗局真相" },
      { name: "自创功法", realmGate: [11, 20], reward: "天命神通·废材逆袭" },
      { name: "混沌或五行", realmGate: [21, 40], reward: "混沌体/五行体（分支）" },
      { name: "废材联盟", realmGate: [41, 60], reward: "同道网络" },
      { name: "大道至简", realmGate: [61, 80], reward: "至简法则碎片" },
      { name: "圣地终章", realmGate: [81, 95], reward: "道统信物·问心石" },
    ],
  },
];

export function storylineByKey(key: string): StorylineSeed {
  const s = STORYLINE_SEEDS.find((x) => x.key === key);
  if (!s) throw new Error(`未知天命主线: ${key}`);
  return s;
}
