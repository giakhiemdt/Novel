import { Trait } from "../../shared/types/trait";

export const ITEM_STATUSES = [
  "owned",
  "stored",
  "damaged",
  "lost",
  "stolen",
  "destroyed",
] as const;
export const ITEM_OWNER_TYPES = ["character", "faction"] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type ItemOwnerType = (typeof ITEM_OWNER_TYPES)[number];

export type ItemInput = {
  id?: string;
  name: string;
  origin?: string;
  ownerId?: string;
  ownerType?: ItemOwnerType;
  status?: ItemStatus;
  powerLevel?: number;
  powerDescription?: string;
  abilities?: Array<Trait | string>;
  notes?: string;
  tags?: string[];
};

export type ItemNode = ItemInput & {
  id: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type ItemListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  status?: ItemStatus;
  ownerId?: string;
  ownerType?: ItemOwnerType;
  total?: number;
};
