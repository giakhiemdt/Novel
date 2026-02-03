export type CharacterRelationType =
  | "family"
  | "ally"
  | "enemy"
  | "romance"
  | "mentor"
  | "rival"
  | "other";

export type CharacterRelationPayload = {
  fromId: string;
  toId: string;
  type: CharacterRelationType;
  startYear?: number;
  endYear?: number;
  note?: string;
};

export type CharacterRelation = CharacterRelationPayload & {
  createdAt: string;
  updatedAt: string;
};

export type CharacterRelationQuery = {
  characterId?: string;
  type?: CharacterRelationType;
};
