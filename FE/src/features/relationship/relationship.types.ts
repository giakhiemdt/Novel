export type CharacterRelationPayload = {
  fromId: string;
  toId: string;
  type: string;
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
  type?: string;
};
