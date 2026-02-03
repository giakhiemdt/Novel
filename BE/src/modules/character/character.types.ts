export type CharacterLevel = "T1" | "T2" | "T3" | "T4" | "T5" | "T6" | "T7";
export type CharacterStatus = "Alive" | "Dead";
export type CharacterGender = "male" | "female" | "other";
export type CharacterRace = "human" | "elf" | "demon";

export type CharacterInput = {
  id?: string;
  name: string;
  alias?: string[];
  soulArt?: string[];
  level?: CharacterLevel;
  status?: CharacterStatus;
  isMainCharacter?: boolean;
  gender: CharacterGender;
  age: number;
  race: CharacterRace;
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
  status: CharacterStatus;
  isMainCharacter: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CharacterListQuery = {
  limit?: number;
  offset?: number;
  name?: string;
  tag?: string;
  race?: CharacterRace;
  gender?: CharacterGender;
  status?: CharacterStatus;
  level?: CharacterLevel;
  isMainCharacter?: boolean;
};
