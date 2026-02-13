export type RelationshipTypeInput = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  isDirectional?: boolean;
  color?: string;
  isSystem?: boolean;
  isActive?: boolean;
};

export type RelationshipTypeNode = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isDirectional: boolean;
  color?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RelationshipTypeListQuery = {
  activeOnly?: boolean;
};
