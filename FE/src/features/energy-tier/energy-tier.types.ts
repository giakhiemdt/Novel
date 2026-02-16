export type EnergyTierPayload = {
  id?: string;
  energyTypeId: string;
  code: string;
  name: string;
  level?: number;
  description?: string;
  color?: string;
  isActive?: boolean;
};

export type EnergyTier = EnergyTierPayload & {
  id: string;
  energyTypeName?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EnergyTierLinkPayload = {
  previousId: string;
  currentId: string;
  requiredAmount?: number;
  efficiency?: number;
  condition?: string;
};

export type EnergyTierLink = EnergyTierLinkPayload & {
  updatedAt?: string;
};
