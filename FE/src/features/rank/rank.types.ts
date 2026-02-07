export type RankCondition = {
  name: string;
  description?: string;
};

export type RankPayload = {
  id?: string;
  systemId?: string;
  name: string;
  alias?: string[];
  tier?: string;
  system?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  previousId?: string;
  nextId?: string;
  conditions?: RankCondition[];
  color?: string;
};

export type Rank = RankPayload & {
  createdAt?: string;
  updatedAt?: string;
};

export type RankLinkPayload = {
  currentId: string;
  previousId: string;
  conditions?: RankCondition[];
};
