export type CharacterStatus = "Alive" | "Dead";
export type CharacterGender = "male" | "female" | "other";

export type CharacterInput = {
  id?: string;
  name: string;
  alias?: string[];
  level?: string;
  status?: CharacterStatus;
  isMainCharacter?: boolean;
  gender: CharacterGender;
  age: number;
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

export type CharacterNode = CharacterInput & {
  id: string;
  status: CharacterStatus;
  isMainCharacter: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CharacterListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  race?: string;
  specialAbility?: string;
  gender?: CharacterGender;
  status?: CharacterStatus;
  level?: string;
  isMainCharacter?: boolean;
};
