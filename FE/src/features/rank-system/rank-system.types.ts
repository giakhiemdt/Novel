export type RankSystemPayload = {
  id?: string;
  name: string;
  code?: string;
  description?: string;
  domain?: string;
  energyType?: string;
  priority?: number;
  isPrimary?: boolean;
  tags?: string[];
};

export type RankSystem = Omit<RankSystemPayload, "id"> & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};
