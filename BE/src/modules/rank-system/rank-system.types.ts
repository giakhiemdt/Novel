export type RankSystemInput = {
  id?: string;
  name: string;
  code?: string;
  description?: string;
  domain?: string;
  priority?: number;
  isPrimary?: boolean;
  tags?: string[];
};

export type RankSystemNode = RankSystemInput & {
  createdAt: string;
  updatedAt: string;
};

export type RankSystemListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  domain?: string;
  total?: number;
};
