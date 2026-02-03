export type ItemStatus = "owned" | "lost" | "destroyed";
export type ItemOwnerType = "character" | "faction";

export type ItemInput = {
  id?: string;
  name: string;
  origin?: string;
  ownerId?: string;
  ownerType?: ItemOwnerType;
  status?: ItemStatus;
  powerLevel?: number;
  powerDescription?: string;
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
};
