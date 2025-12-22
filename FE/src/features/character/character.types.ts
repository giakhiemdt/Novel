export type CharacterPayload = {
  id?: string;
  name: string;
  alias?: string[];
  soulArt?: string[];
  level?: "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7";
  status?: "Alive" | "Dead";
  isMainCharacter?: boolean;
  gender: "male" | "female" | "other";
  age: number;
  race: "human" | "elf" | "demon";
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

export type Character = CharacterPayload & {
  createdAt?: string;
  updatedAt?: string;
};
