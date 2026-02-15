export type EnergyTypePayload = {
  id?: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
};

export type EnergyType = {
  id: string;
  code: string;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

