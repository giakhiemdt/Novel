export type EnergyTypeTrait = {
  name: string;
  description?: string;
};

export type EnergyTypePayload = {
  id?: string;
  code: string;
  name: string;
  levelCount?: number;
  levelRatios?: number[];
  traits?: EnergyTypeTrait[];
  description?: string;
  color?: string;
  isActive?: boolean;
};

export type EnergyType = {
  id: string;
  code: string;
  name: string;
  levelCount?: number;
  levelRatios?: number[];
  traits?: EnergyTypeTrait[];
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EnergyConversionPayload = {
  fromId: string;
  toId: string;
  ratio?: number;
  lossRate?: number;
  condition?: string;
  color?: string;
  isActive?: boolean;
};

export type EnergyConversion = EnergyConversionPayload & {
  fromCode?: string;
  fromName?: string;
  toCode?: string;
  toName?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};
