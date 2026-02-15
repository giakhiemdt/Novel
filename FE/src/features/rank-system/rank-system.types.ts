export type RankSystemPayload = {
  id?: string;
  name: string;
  code?: string;
  description?: string;
  domain?: string;
  energyTypeId?: string;
  energyTypeName?: string;
  priority?: number;
  isPrimary?: boolean;
  tags?: string[];
};

export type RankSystem = Omit<RankSystemPayload, "id"> & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};
