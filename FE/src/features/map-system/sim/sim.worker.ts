import { buildSimulationMesh } from "./mesh";
import type {
  SimulationMeshResult,
  SimulationMeshWorkerRequest,
  SimulationMeshWorkerResponse,
} from "./types";

const MAX_CACHE_SIZE = 24;
const meshCache = new Map<string, SimulationMeshResult>();

const readCache = (cacheKey: string): SimulationMeshResult | undefined => {
  const cached = meshCache.get(cacheKey);
  if (!cached) {
    return undefined;
  }
  meshCache.delete(cacheKey);
  meshCache.set(cacheKey, cached);
  return cached;
};

const writeCache = (cacheKey: string, mesh: SimulationMeshResult): void => {
  if (meshCache.has(cacheKey)) {
    meshCache.delete(cacheKey);
  }
  meshCache.set(cacheKey, mesh);
  if (meshCache.size > MAX_CACHE_SIZE) {
    const oldestKey = meshCache.keys().next().value;
    if (typeof oldestKey === "string") {
      meshCache.delete(oldestKey);
    }
  }
};

self.onmessage = (event: MessageEvent<SimulationMeshWorkerRequest>) => {
  const { requestId, cacheKey, input } = event.data;
  const cached = readCache(cacheKey);
  if (cached) {
    const payload: SimulationMeshWorkerResponse = {
      requestId,
      cacheKey,
      cacheHit: true,
      mesh: cached,
    };
    self.postMessage(payload);
    return;
  }

  const mesh = buildSimulationMesh(input);
  writeCache(cacheKey, mesh);
  const payload: SimulationMeshWorkerResponse = {
    requestId,
    cacheKey,
    cacheHit: false,
    mesh,
  };
  self.postMessage(payload);
};

export {};
