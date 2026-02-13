export type CharacterRelationInput = {
  fromId: string;
  toId: string;
  type: string;
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
  type?: string;
};
