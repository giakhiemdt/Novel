export type EnergyTypeInput = {
  id?: string;
  code: string;
  name: string;
  levelCount?: number;
  levelRatios?: number[];
  description?: string;
  color?: string;
  isActive?: boolean;
};

export type EnergyTypeNode = {
  id: string;
  code: string;
  name: string;
  levelCount?: number;
  levelRatios?: number[];
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type EnergyTypeListQuery = {
  activeOnly?: boolean;
};

export type EnergyConversionInput = {
  fromId: string;
  toId: string;
  ratio?: number;
  lossRate?: number;
  condition?: string;
  color?: string;
  isActive?: boolean;
};

export type EnergyConversionNode = {
  fromId: string;
  fromCode?: string;
  fromName?: string;
  toId: string;
  toCode?: string;
  toName?: string;
  ratio?: number;
  lossRate?: number;
  condition?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
