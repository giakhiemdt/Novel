export type RankPayload = {
  id?: string;
  name: string;
  alias?: string[];
  tier?: string;
  system?: string;
  description?: string;
  notes?: string;
  tags?: string[];
};

export type Rank = RankPayload & {
  createdAt?: string;
  updatedAt?: string;
};
