// MarketService：坊市货架查看与交易（docs/16 设定·十六章）
import { bargain, canEnterMarket, createRng, hashSeed, rollShelf } from "@xunxian/engine";
import type { MarketShelf, MarketTier } from "@xunxian/engine";
import { store } from "../store.js";
import { ServiceError } from "./archiveService.js";

async function requireOwned(archiveId: string, deviceId: string) {
  const archive = await store.findArchive(archiveId);
  if (!archive) throw new ServiceError(404, "存档不存在");
  if (archive.deviceId !== deviceId) throw new ServiceError(403, "无权访问该存档");
  const state = await store.getPlayerState(archiveId);
  if (!state) throw new ServiceError(500, "存档状态缺失");
  return state;
}

/** 当月货架（确定性：存档+回合+层级） */
export async function getShelf(archiveId: string, deviceId: string, tier: MarketTier): Promise<MarketShelf> {
  const state = await requireOwned(archiveId, deviceId);
  if (!canEnterMarket(tier, state.cultivation.level)) {
    throw new ServiceError(403, "修为不足，无法进入宗门秘库（需金丹期或核心弟子引荐）");
  }
  const rng = createRng(hashSeed(archiveId, "market", tier, state.turnNo));
  return rollShelf(tier, archiveId, rng);
}

export interface TradeOutput {
  message: string;
  finalPrice: number;
  item: { key: string; name: string; category: string };
  balance: number;
}

/** 购买（可选议价：bargain=true 走议价折扣，可能失败按原价或放弃） */
export async function buy(
  archiveId: string, deviceId: string,
  input: { tier: MarketTier; itemKey: string; bargain?: boolean; acceptOriginal?: boolean },
): Promise<TradeOutput> {
  const state = await requireOwned(archiveId, deviceId);
  const existing = await store.getTurnRecord(archiveId, state.turnNo);
  if (existing) throw new ServiceError(409, "本月已行动，坊市采买请安排在决策罗盘的百艺/交易选项中（或下月再来）");

  const shelf = await getShelf(archiveId, deviceId, input.tier);
  const item = shelf.items.find((i) => i.key === input.itemKey);
  if (!item) throw new ServiceError(404, "货架无此物品（本月货架已刷新）");

  const rng = createRng(hashSeed(archiveId, "trade", state.turnNo, input.itemKey));
  let finalPrice = item.price;
  let message = `购得【${item.name}】。`;
  if (input.bargain) {
    const r = bargain(shelf, item, 0, rng);
    if (r.ok) { finalPrice = r.finalPrice; message = `${r.message}以 ${finalPrice} 灵石购得【${item.name}】。`; }
    else if (!input.acceptOriginal) throw new ServiceError(422, r.message);
    else message = `${r.message}仍以原价 ${finalPrice} 灵石购得【${item.name}】。`;
  }

  const paid = await store.spendCurrency(archiveId, finalPrice);
  if (!paid) throw new ServiceError(422, `灵石不足（需 ${finalPrice} 下品灵石）`);
  await store.addItem(archiveId, { key: item.key, name: item.name, category: item.category, qty: 1 }, state.turnNo);

  const after = await store.getPlayerState(archiveId);
  return { message, finalPrice, item: { key: item.key, name: item.name, category: item.category }, balance: after?.currencies.low ?? 0 };
}

export async function listInventory(archiveId: string, deviceId: string) {
  await requireOwned(archiveId, deviceId);
  return store.getInventory(archiveId);
}
