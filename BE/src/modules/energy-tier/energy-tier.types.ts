export type EnergyTierInput = {
  id?: string;
  energyTypeId: string;
  code: string;
  name: string;
  level?: number;
  description?: string;
  color?: string;
  isActive?: boolean;
};

export type EnergyTierNode = {
  id: string;
  energyTypeId: string;
  energyTypeName?: string;
  code: string;
  name: string;
  level?: number;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EnergyTierListQuery = {
  activeOnly?: boolean;
  energyTypeId?: string;
};

export type EnergyTierLinkInput = {
  currentId: string;
  previousId: string;
  requiredAmount?: number;
  efficiency?: number;
  condition?: string;
};

export type EnergyTierLinkNode = {
  previousId: string;
  currentId: string;
  requiredAmount?: number;
  efficiency?: number;
  condition?: string;
  updatedAt: string;
};
