import type { Trait } from "../../types/trait";

export const ITEM_STATUSES = [
  "owned",
  "stored",
  "damaged",
  "lost",
  "stolen",
  "destroyed",
] as const;
export const ITEM_OWNER_TYPES = ["character", "faction"] as const;
export const ITEM_TYPES = [
  "resource",
  "currency",
  "mineral",
  "consumable",
  "equipment",
  "relic",
  "kim-chi-thu",
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type ItemOwnerType = (typeof ITEM_OWNER_TYPES)[number];
export type ItemType = (typeof ITEM_TYPES)[number];

export type ItemPayload = {
  id?: string;
  name: string;
  origin?: string;
  ownerId?: string;
  ownerType?: ItemOwnerType;
  type?: ItemType;
  status?: ItemStatus;
  powerLevel?: number;
  powerDescription?: string;
  abilities?: Trait[];
  notes?: string;
  tags?: string[];
};

export type Item = ItemPayload & {
  id: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
};
