export type RelationshipTypeInput = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  isDirectional?: boolean;
  color?: string;
  isActive?: boolean;
};

export type RelationshipTypeNode = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isDirectional: boolean;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RelationshipTypeListQuery = {
  activeOnly?: boolean;
};
