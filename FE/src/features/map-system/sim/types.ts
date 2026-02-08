import type { BiomeKind, GeneratedMapLayers } from "../map-generator";

export type SimulationMeshQuality = "low" | "medium" | "high";

export type SimulationPoint = { x: number; y: number };
export type SimulationMeshPoint = SimulationPoint & { r: number };
export type SimulationMeshFace = { a: number; b: number; c: number };
export type SimulationMeshCell = { site: number; vertices: SimulationPoint[] };
export type SimulationMeshBoundary = {
  a: number;
  b: number;
  p1: SimulationPoint;
  p2: SimulationPoint;
};

export type SimulationMeshResult = {
  points: SimulationMeshPoint[];
  faces: SimulationMeshFace[];
  cells: SimulationMeshCell[];
  boundaries: SimulationMeshBoundary[];
};

export type SimulationMeshLayers = Pick<
  GeneratedMapLayers,
  "cellsX" | "cellsY" | "height" | "biome"
>;

export type SimulationMeshBuildInput = {
  seed: string;
  width: number;
  height: number;
  seaLevel: number;
  quality: SimulationMeshQuality;
  layers: SimulationMeshLayers;
};

export type SimulationMeshWorkerRequest = {
  requestId: number;
  cacheKey: string;
  input: SimulationMeshBuildInput;
};

export type SimulationMeshWorkerResponse = {
  requestId: number;
  cacheKey: string;
  cacheHit: boolean;
  mesh: SimulationMeshResult;
};

export type { BiomeKind };
