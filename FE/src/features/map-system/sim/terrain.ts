import {
  createMapCacheKey,
  generateMapLayers,
  type BiomeKind,
  type GeneratedMapLayers,
  type MapGeneratorOptions,
} from "../map-generator";

const SIM_TERRAIN_VERSION = "sim-terrain-v1";

export type SimulationTerrainWorkerRequest = {
  requestId: number;
  cacheKey: string;
  options: MapGeneratorOptions;
};

export type SimulationTerrainWorkerResponse = {
  requestId: number;
  cacheKey: string;
  cacheHit: boolean;
  layers: GeneratedMapLayers;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const classifyBiome = (
  isLand: boolean,
  altitude: number,
  seaLevel: number,
  moisture: number,
  temperature: number
): BiomeKind => {
  if (!isLand) {
    return "ocean";
  }

  if (altitude <= seaLevel + 0.01) {
    return "beach";
  }

  if (altitude > 0.96) {
    return temperature < 0.28 ? "snow" : "rock";
  }
  if (altitude > 0.9 && temperature < 0.24) {
    return "snow";
  }

  if (temperature < 0.16) {
    return "snow";
  }
  if (temperature < 0.3) {
    return moisture > 0.42 ? "taiga" : "tundra";
  }

  if (moisture < 0.17) {
    return "desert";
  }
  if (moisture < 0.34) {
    return temperature > 0.58 ? "savanna" : "grassland";
  }
  if (moisture < 0.66) {
    return "forest";
  }
  return temperature > 0.45 ? "rainforest" : "forest";
};

const getNeighbors = (x: number, y: number, maxX: number, maxY: number) => {
  const out: Array<{ x: number; y: number }> = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < maxX && ny >= 0 && ny < maxY) {
        out.push({ x: nx, y: ny });
      }
    }
  }
  return out;
};

const hash01 = (seed: string, x: number, y: number, salt = 0): number => {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= x + 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h ^= y + 0x85ebca6b;
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h >>> 0) % 1000000) / 1000000;
};

const buildRiverLayer = (
  seed: string,
  height: number[][],
  moisture: number[][],
  isLand: boolean[][],
  seaLevel: number
): boolean[][] => {
  const cellsY = height.length;
  const cellsX = height[0]?.length ?? 0;
  const river: boolean[][] = Array.from({ length: cellsY }, () =>
    Array.from({ length: cellsX }, () => false)
  );

  const sources: Array<{ x: number; y: number; score: number }> = [];
  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      if (!isLand[y][x]) {
        continue;
      }
      const altitude = height[y][x];
      const wetness = moisture[y][x];
      if (altitude > seaLevel + 0.13 && wetness > 0.44) {
        const variance = hash01(seed, x, y, 909);
        sources.push({
          x,
          y,
          score: altitude * 0.65 + wetness * 0.35 + variance * 0.06,
        });
      }
    }
  }

  sources.sort((a, b) => b.score - a.score);
  const sourceCount = clamp(Math.floor((cellsX * cellsY) / 900), 9, 48);

  for (let i = 0; i < Math.min(sourceCount, sources.length); i += 1) {
    const source = sources[i];
    let cx = source.x;
    let cy = source.y;
    const visited = new Set<string>();

    for (let step = 0; step < 260; step += 1) {
      const key = `${cx},${cy}`;
      if (visited.has(key)) {
        break;
      }
      visited.add(key);
      river[cy][cx] = true;

      if (!isLand[cy][cx] || height[cy][cx] <= seaLevel + 0.005) {
        break;
      }

      const here = height[cy][cx];
      const neighbors = getNeighbors(cx, cy, cellsX, cellsY);
      let next = { x: cx, y: cy };
      let nextHeight = here;
      for (const n of neighbors) {
        const nh = height[n.y][n.x];
        if (nh < nextHeight) {
          next = n;
          nextHeight = nh;
        }
      }

      if (next.x === cx && next.y === cy) {
        break;
      }
      cx = next.x;
      cy = next.y;
    }
  }

  return river;
};

const ensureOceanBorder = (height: number[][], seaLevel: number) => {
  const cellsY = height.length;
  const cellsX = height[0]?.length ?? 0;
  const rim = Math.max(2, Math.floor(Math.min(cellsX, cellsY) * 0.045));
  const edgeSea = clamp(seaLevel - 0.02, 0, 1);
  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      const dist = Math.min(x, cellsX - 1 - x, y, cellsY - 1 - y);
      if (dist < rim && height[y][x] > edgeSea) {
        height[y][x] = edgeSea;
      }
    }
  }
};

const applyThermalErosion = (
  height: number[][],
  seaLevel: number,
  iterations: number
) => {
  const cellsY = height.length;
  const cellsX = height[0]?.length ?? 0;
  const talusLand = 0.023;
  const talusSea = 0.01;
  const transferFactor = 0.22;

  for (let it = 0; it < iterations; it += 1) {
    const delta: number[][] = Array.from({ length: cellsY }, () =>
      Array.from({ length: cellsX }, () => 0)
    );
    for (let y = 0; y < cellsY; y += 1) {
      for (let x = 0; x < cellsX; x += 1) {
        const here = height[y][x];
        const neighbors = getNeighbors(x, y, cellsX, cellsY);
        const lowers: Array<{ x: number; y: number; excess: number }> = [];
        let sumExcess = 0;
        let maxDiff = 0;
        const talus = here > seaLevel ? talusLand : talusSea;

        for (const n of neighbors) {
          const diff = here - height[n.y][n.x];
          if (diff <= talus) {
            continue;
          }
          const excess = diff - talus;
          sumExcess += excess;
          if (diff > maxDiff) {
            maxDiff = diff;
          }
          lowers.push({ x: n.x, y: n.y, excess });
        }
        if (lowers.length === 0 || sumExcess <= 0) {
          continue;
        }

        const capacity = clamp(
          (maxDiff - talus) * transferFactor,
          0,
          here > seaLevel ? 0.052 : 0.024
        );
        if (capacity <= 0) {
          continue;
        }
        delta[y][x] -= capacity;
        for (const lower of lowers) {
          delta[lower.y][lower.x] += capacity * (lower.excess / sumExcess);
        }
      }
    }

    for (let y = 0; y < cellsY; y += 1) {
      for (let x = 0; x < cellsX; x += 1) {
        height[y][x] = clamp(height[y][x] + delta[y][x], 0, 1);
      }
    }
  }
};

export const createSimulationTerrainCacheKey = (
  options: MapGeneratorOptions
): string => {
  return `${SIM_TERRAIN_VERSION}|${createMapCacheKey(options)}`;
};

export const generateSimulationLayers = (
  options: MapGeneratorOptions
): GeneratedMapLayers => {
  const base = generateMapLayers(options);
  const seaLevel = clamp(options.seaLevel, 0, 1);
  const height = base.height.map((row) => row.slice());
  const moisture = base.moisture.map((row) => row.slice());
  const temperature = base.temperature.map((row) => row.slice());
  const cellsY = height.length;
  const cellsX = height[0]?.length ?? 0;

  applyThermalErosion(height, seaLevel, 14);
  ensureOceanBorder(height, seaLevel);

  const isLand: boolean[][] = Array.from({ length: cellsY }, () =>
    Array.from({ length: cellsX }, () => false)
  );
  const biome: BiomeKind[][] = Array.from({ length: cellsY }, () =>
    Array.from({ length: cellsX }, () => "ocean")
  );

  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      const altitude = height[y][x];
      const altitudeNorm = clamp(
        (altitude - seaLevel) / Math.max(0.001, 1 - seaLevel),
        0,
        1
      );
      moisture[y][x] = clamp(moisture[y][x] + (1 - altitudeNorm) * 0.035, 0, 1);
      temperature[y][x] = clamp(temperature[y][x] - altitudeNorm * 0.07, 0, 1);
      const land = altitude > seaLevel;
      isLand[y][x] = land;
      biome[y][x] = classifyBiome(
        land,
        altitude,
        seaLevel,
        moisture[y][x],
        temperature[y][x]
      );
    }
  }

  const river = buildRiverLayer(options.seed, height, moisture, isLand, seaLevel);

  return {
    cellsX: base.cellsX,
    cellsY: base.cellsY,
    height,
    moisture,
    temperature,
    isLand,
    biome,
    river,
  };
};
