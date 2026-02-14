export type RankCondition = {
  name: string;
  description?: string;
};

export type RankPreviousLink = {
  previousId: string;
  conditions?: RankCondition[];
};

export type RankBoardPosition = {
  x: number;
  y: number;
};

export type RankBoardLayout = {
  positions: Record<string, RankBoardPosition>;
  updatedAt: string;
};

export type RankInput = {
  id?: string;
  systemId?: string;
  name: string;
  alias?: string[];
  tier?: string;
  system?: string;
  description?: string;
  notes?: string;
  tags?: string[];
  color?: string;
};

export type RankNode = RankInput & {
  createdAt: string;
  updatedAt: string;
  previousLinks?: RankPreviousLink[];
  previousId?: string;
  nextId?: string;
  conditions?: RankCondition[];
};

export type RankListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  tier?: string;
  system?: string;
  systemId?: string;
  total?: number;
};
