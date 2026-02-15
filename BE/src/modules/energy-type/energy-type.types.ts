export type EnergyTypeInput = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
};

export type EnergyTypeNode = {
  id: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EnergyTypeListQuery = {
  activeOnly?: boolean;
};
