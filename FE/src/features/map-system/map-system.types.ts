export type MapScope = "world" | "region" | "local";

export type MapSystemPayload = {
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

export type MapSystem = Omit<MapSystemPayload, "id"> & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
};
