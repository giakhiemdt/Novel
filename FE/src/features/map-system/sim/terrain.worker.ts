import { generateSimulationLayers } from "./terrain";
import type {
  SimulationTerrainWorkerRequest,
  SimulationTerrainWorkerResponse,
} from "./terrain";
import type { GeneratedMapLayers } from "../map-generator";

const MAX_CACHE_SIZE = 24;
const layerCache = new Map<string, GeneratedMapLayers>();

const readCache = (cacheKey: string): GeneratedMapLayers | undefined => {
  const cached = layerCache.get(cacheKey);
  if (!cached) {
    return undefined;
  }
  layerCache.delete(cacheKey);
  layerCache.set(cacheKey, cached);
  return cached;
};

const writeCache = (cacheKey: string, layers: GeneratedMapLayers): void => {
  if (layerCache.has(cacheKey)) {
    layerCache.delete(cacheKey);
  }
  layerCache.set(cacheKey, layers);
  if (layerCache.size > MAX_CACHE_SIZE) {
    const oldestKey = layerCache.keys().next().value;
    if (typeof oldestKey === "string") {
      layerCache.delete(oldestKey);
    }
  }
};

self.onmessage = (event: MessageEvent<SimulationTerrainWorkerRequest>) => {
  const { requestId, cacheKey, options } = event.data;
  const cached = readCache(cacheKey);
  if (cached) {
    const payload: SimulationTerrainWorkerResponse = {
      requestId,
      cacheKey,
      cacheHit: true,
      layers: cached,
    };
    self.postMessage(payload);
    return;
  }

  const layers = generateSimulationLayers(options);
  writeCache(cacheKey, layers);
  const payload: SimulationTerrainWorkerResponse = {
    requestId,
    cacheKey,
    cacheHit: false,
    layers,
  };
  self.postMessage(payload);
};

export {};
