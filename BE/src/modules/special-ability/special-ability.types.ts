export type SpecialAbilityType = "innate" | "acquired";

export type SpecialAbilityInput = {
  id?: string;
  name: string;
  type?: SpecialAbilityType;
  description?: string;
  notes?: string;
  tags?: string[];
};

export type SpecialAbilityNode = SpecialAbilityInput & {
  createdAt: string;
  updatedAt: string;
};

export type SpecialAbilityListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  type?: SpecialAbilityType;
};
