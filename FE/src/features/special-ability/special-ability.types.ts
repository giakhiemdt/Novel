export type SpecialAbilityType = "innate" | "acquired";

export type SpecialAbilityPayload = {
  id?: string;
  name: string;
  type?: SpecialAbilityType;
  description?: string;
  notes?: string;
  tags?: string[];
};

export type SpecialAbility = SpecialAbilityPayload & {
  createdAt?: string;
  updatedAt?: string;
};
