import {
  createMapCacheKey,
  generateMapLayers,
  type BiomeKind,
  type GeneratedMapLayers,
  type MapGeneratorOptions,
} from "../map-generator";

const SIM_TERRAIN_VERSION = "sim-terrain-v2";

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

const buildFlowAndRiverLayer = (
  height: number[][],
  moisture: number[][],
  isLand: boolean[][],
  seaLevel: number
): {
  river: boolean[][];
  flow: number[][];
  receiver: number[];
} => {
  const cellsY = height.length;
  const cellsX = height[0]?.length ?? 0;
  const river: boolean[][] = Array.from({ length: cellsY }, () =>
    Array.from({ length: cellsX }, () => false)
  );
  const flow: number[][] = Array.from({ length: cellsY }, () =>
    Array.from({ length: cellsX }, () => 0)
  );
  const receiver = Array.from({ length: cellsX * cellsY }, () => -1);
  const order: Array<{ idx: number; h: number }> = [];

  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      const idx = y * cellsX + x;
      const altitude = height[y][x];
      const neighbors = getNeighbors(x, y, cellsX, cellsY);

      let bestLowerIdx = -1;
      let bestLowerHeight = altitude;
      let bestAnyIdx = -1;
      let bestAnyHeight = Number.POSITIVE_INFINITY;
      for (const n of neighbors) {
        const nh = height[n.y][n.x];
        if (nh < bestAnyHeight) {
          bestAnyHeight = nh;
          bestAnyIdx = n.y * cellsX + n.x;
        }
        if (nh < bestLowerHeight - 1e-6) {
          bestLowerHeight = nh;
          bestLowerIdx = n.y * cellsX + n.x;
        }
      }

      if (!isLand[y][x]) {
        receiver[idx] = -1;
      } else if (bestLowerIdx >= 0) {
        receiver[idx] = bestLowerIdx;
      } else if (bestAnyIdx >= 0 && bestAnyHeight <= altitude + 0.018) {
        receiver[idx] = bestAnyIdx;
      } else {
        receiver[idx] = -1;
      }

      flow[y][x] = isLand[y][x]
        ? 0.18 + moisture[y][x] * 0.78
        : 0.06 + moisture[y][x] * 0.2;
      order.push({ idx, h: altitude });
    }
  }

  order.sort((a, b) => b.h - a.h);
  for (const item of order) {
    const x = item.idx % cellsX;
    const y = Math.floor(item.idx / cellsX);
    const next = receiver[item.idx];
    if (next < 0) {
      continue;
    }
    const nx = next % cellsX;
    const ny = Math.floor(next / cellsX);
    flow[ny][nx] += flow[y][x] * 0.985;
  }

  let maxFlow = 0;
  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      if (!isLand[y][x]) {
        continue;
      }
      if (flow[y][x] > maxFlow) {
        maxFlow = flow[y][x];
      }
    }
  }
  const baseThreshold = Math.max(0.48, maxFlow * 0.028);
  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      if (!isLand[y][x]) {
        continue;
      }
      if (height[y][x] <= seaLevel + 0.004) {
        continue;
      }
      const idx = y * cellsX + x;
      if (receiver[idx] < 0) {
        continue;
      }
      const moistureFactor = 1.16 - moisture[y][x] * 0.34;
      const localThreshold = baseThreshold * clamp(moistureFactor, 0.8, 1.22);
      if (flow[y][x] >= localThreshold) {
        river[y][x] = true;
      }
    }
  }

  return { river, flow, receiver };
};

const carveRivers = (
  height: number[][],
  flow: number[][],
  receiver: number[],
  river: boolean[][],
  isLand: boolean[][],
  seaLevel: number
) => {
  const cellsY = height.length;
  const cellsX = height[0]?.length ?? 0;
  let maxFlow = 0;
  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      if (flow[y][x] > maxFlow) {
        maxFlow = flow[y][x];
      }
    }
  }
  if (maxFlow <= 0) {
    return;
  }

  const delta: number[][] = Array.from({ length: cellsY }, () =>
    Array.from({ length: cellsX }, () => 0)
  );
  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      if (!river[y][x] || !isLand[y][x]) {
        continue;
      }
      const idx = y * cellsX + x;
      const next = receiver[idx];
      const normFlow = flow[y][x] / maxFlow;
      const incision = clamp((normFlow - 0.018) * 0.078, 0.002, 0.05);
      delta[y][x] -= incision;

      if (next >= 0) {
        const nx = next % cellsX;
        const ny = Math.floor(next / cellsX);
        delta[ny][nx] -= incision * 0.38;
      }

      const neighbors = getNeighbors(x, y, cellsX, cellsY);
      for (const n of neighbors) {
        if (!isLand[n.y][n.x]) {
          continue;
        }
        delta[n.y][n.x] -= incision * 0.18;
      }
    }
  }

  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      const floor = isLand[y][x] ? seaLevel - 0.01 : 0;
      height[y][x] = clamp(Math.max(floor, height[y][x] + delta[y][x]), 0, 1);
    }
  }
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
      isLand[y][x] = altitude > seaLevel;
    }
  }

  const hydroFirst = buildFlowAndRiverLayer(height, moisture, isLand, seaLevel);
  carveRivers(
    height,
    hydroFirst.flow,
    hydroFirst.receiver,
    hydroFirst.river,
    isLand,
    seaLevel
  );

  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      const altitude = height[y][x];
      const altitudeNorm = clamp(
        (altitude - seaLevel) / Math.max(0.001, 1 - seaLevel),
        0,
        1
      );
      if (hydroFirst.river[y][x]) {
        moisture[y][x] = clamp(moisture[y][x] + 0.08, 0, 1);
      }
      temperature[y][x] = clamp(temperature[y][x] - altitudeNorm * 0.02, 0, 1);
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

  const hydroFinal = buildFlowAndRiverLayer(height, moisture, isLand, seaLevel);
  const river = hydroFinal.river;

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
