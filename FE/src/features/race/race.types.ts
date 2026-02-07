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

export type Race = Omit<RacePayload, "id"> & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};
