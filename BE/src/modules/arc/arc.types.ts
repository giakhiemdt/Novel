export type ArcInput = {
  id?: string;
  name: string;
  order?: number;
  summary?: string;
  notes?: string;
  tags?: string[];
};

export type ArcNode = ArcInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type ArcListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
};
