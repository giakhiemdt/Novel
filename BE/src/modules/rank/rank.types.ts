export type RankInput = {
  id?: string;
  name: string;
  alias?: string[];
  tier?: string;
  system?: string;
  description?: string;
  notes?: string;
  tags?: string[];
};

export type RankNode = RankInput & {
  createdAt: string;
  updatedAt: string;
  previousId?: string;
  nextId?: string;
  conditions?: string[];
};

export type RankListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  tier?: string;
  system?: string;
};
