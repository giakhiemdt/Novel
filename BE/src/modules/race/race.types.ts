export type RaceInput = {
  id?: string;
  name: string;
  alias?: string[];
  description?: string;
  origin?: string;
  traits?: string[];
  culture?: string;
  lifespan?: string;
  notes?: string;
  tags?: string[];
};

export type RaceNode = RaceInput & {
  createdAt: string;
  updatedAt: string;
};

export type RaceListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  origin?: string;
  culture?: string;
  total?: number;
};
