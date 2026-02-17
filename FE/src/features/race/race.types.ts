import type { Trait } from "../../types/trait";

export type RacePayload = {
  id?: string;
  name: string;
  alias?: string[];
  description?: string;
  origin?: string;
  traits?: Trait[];
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
