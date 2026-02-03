export type CharacterRelationType =
  | "family"
  | "ally"
  | "enemy"
  | "romance"
  | "mentor"
  | "rival"
  | "other";

export type CharacterRelationInput = {
  fromId: string;
  toId: string;
  type: CharacterRelationType;
  startYear?: number;
  endYear?: number;
  note?: string;
};

export type CharacterRelationNode = CharacterRelationInput & {
  createdAt: string;
  updatedAt: string;
};

export type CharacterRelationQuery = {
  characterId?: string;
  type?: CharacterRelationType;
};
