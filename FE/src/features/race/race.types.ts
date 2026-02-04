export type RacePayload = {
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

export type Race = RacePayload & {
  createdAt?: string;
  updatedAt?: string;
};
