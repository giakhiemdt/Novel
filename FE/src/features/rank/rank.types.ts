export type RankPayload = {
  id?: string;
  name: string;
  alias?: string[];
  tier?: string;
  system?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  previousId?: string;
  nextId?: string;
  conditions?: string[];
};

export type Rank = RankPayload & {
  createdAt?: string;
  updatedAt?: string;
};

export type RankLinkPayload = {
  currentId: string;
  previousId: string;
  conditions?: string[];
};
