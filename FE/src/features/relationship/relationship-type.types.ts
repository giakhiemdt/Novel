export type RelationshipType = {
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

export type RelationshipTypePayload = {
  code: string;
  name: string;
  description?: string;
  isDirectional?: boolean;
  color?: string;
  isActive?: boolean;
};
