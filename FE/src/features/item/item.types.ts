import type { Trait } from "../../types/trait";

export type ItemStatus = "owned" | "lost" | "destroyed";
export type ItemOwnerType = "character" | "faction";

export type ItemPayload = {
  id?: string;
  name: string;
  origin?: string;
  ownerId?: string;
  ownerType?: ItemOwnerType;
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
