export type CharacterPayload = {
  id?: string;
  name: string;
  alias?: string[];
  level?: string;
  status?: "Alive" | "Dead";
  isMainCharacter?: boolean;
  gender: "male" | "female" | "other";
  age?: number;
  race?: string;
  specialAbilities?: string[];
  extra?: Record<string, unknown>;
  appearance?: string;
  height?: number;
  distinctiveTraits?: string[];
  personalityTraits?: string[];
  beliefs?: string[];
  fears?: string[];
  desires?: string[];
  weaknesses?: string[];
  origin?: string;
  background?: string;
  trauma?: string[];
  secret?: string;
  currentLocation?: string;
  currentGoal?: string;
  currentAffiliation?: string;
  powerState?: string;
  notes?: string;
  tags?: string[];
};

export type Character = Omit<CharacterPayload, "id"> & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};
