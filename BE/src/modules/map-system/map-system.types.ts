export type MapSystemInput = {
  id?: string;
  name: string;
  code?: string;
  description?: string;
  scope?: string;
  seed?: string;
  width?: number;
  height?: number;
  seaLevel?: number;
  climatePreset?: string;
  config?: string;
  notes?: string;
  tags?: string[];
};

export type MapSystemNode = MapSystemInput & {
  createdAt: string;
  updatedAt: string;
};

export type MapSystemListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  code?: string;
  scope?: string;
  total?: number;
};
