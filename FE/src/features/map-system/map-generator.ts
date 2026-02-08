export type ClimatePreset = "temperate" | "arid" | "cold";

export type BiomeKind =
  | "ocean"
  | "beach"
  | "snow"
  | "tundra"
  | "taiga"
  | "grassland"
  | "forest"
  | "rainforest"
  | "desert"
  | "savanna"
  | "rock";

export type MapGeneratorOptions = {
  seed: string;
  width: number;
  height: number;
  seaLevel: number;
  climatePreset: ClimatePreset;
  cellsX?: number;
  cellsY?: number;
};

export type GeneratedMapLayers = {
  cellsX: number;
  cellsY: number;
  height: number[][];
  moisture: number[][];
  temperature: number[][];
  isLand: boolean[][];
  biome: BiomeKind[][];
  river: boolean[][];
};

export type MapGeneratorWorkerRequest = {
  requestId: number;
  cacheKey: string;
  options: MapGeneratorOptions;
};

export type MapGeneratorWorkerResponse = {
  requestId: number;
  cacheKey: string;
  cacheHit: boolean;
  layers: GeneratedMapLayers;
};

const MAP_GENERATOR_VERSION = "v3";

export const createMapCacheKey = (options: MapGeneratorOptions): string => {
  const cellsX = options.cellsX ?? 120;
  const cellsY = options.cellsY ?? 60;
  const seaLevel = clamp(options.seaLevel, 0, 1).toFixed(4);
  return [
    MAP_GENERATOR_VERSION,
    options.seed,
    String(options.width),
    String(options.height),
    seaLevel,
    options.climatePreset,
    String(cellsX),
    String(cellsY),
  ].join("|");
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const make2D = <T>(rows: number, cols: number, fill: (x: number, y: number) => T): T[][] => {
  const matrix: T[][] = [];
  for (let y = 0; y < rows; y += 1) {
    const row: T[] = [];
    for (let x = 0; x < cols; x += 1) {
      row.push(fill(x, y));
    }
    matrix.push(row);
  }
  return matrix;
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const smootherstep = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * c * (c * (c * 6 - 15) + 10);
};

const valueNoise2D = (
  seed: string,
  x: number,
  y: number,
  frequency: number,
  salt = 0
): number => {
  const sx = x * frequency;
  const sy = y * frequency;

  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const tx = smoothstep(sx - x0);
  const ty = smoothstep(sy - y0);

  const v00 = hash01(seed, x0, y0, salt + 11);
  const v10 = hash01(seed, x1, y0, salt + 23);
  const v01 = hash01(seed, x0, y1, salt + 37);
  const v11 = hash01(seed, x1, y1, salt + 47);

  const top = lerp(v00, v10, tx);
  const bottom = lerp(v01, v11, tx);
  return lerp(top, bottom, ty);
};

const fbm2D = (
  seed: string,
  x: number,
  y: number,
  frequency: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  salt: number
): number => {
  let amplitude = 1;
  let total = 0;
  let sum = 0;
  let freq = frequency;
  for (let i = 0; i < octaves; i += 1) {
    total += valueNoise2D(seed, x, y, freq, salt + i * 97) * amplitude;
    sum += amplitude;
    amplitude *= gain;
    freq *= lacunarity;
  }
  return sum > 0 ? total / sum : 0;
};

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

type ContinentBlob = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  weight: number;
  angle: number;
};

const buildContinentBlobs = (seed: string): ContinentBlob[] => {
  const blobs: ContinentBlob[] = [];
  const majorCount = 4 + Math.floor(hash01(seed, 41, 53, 1301) * 3);
  const minorCount = 8 + Math.floor(hash01(seed, 67, 79, 1309) * 5);

  for (let i = 0; i < majorCount; i += 1) {
    const cx = 0.5 + (hash01(seed, i * 37 + 11, i * 19 + 17, 1319) - 0.5) * 0.62;
    const cy = 0.5 + (hash01(seed, i * 41 + 23, i * 29 + 31, 1327) - 0.5) * 0.54;
    const rx = 0.14 + hash01(seed, i * 17 + 7, i * 13 + 5, 1361) * 0.16;
    const ry = 0.12 + hash01(seed, i * 23 + 9, i * 11 + 3, 1367) * 0.15;
    const weight = 0.64 + hash01(seed, i * 31 + 2, i * 7 + 13, 1373) * 0.3;
    const angle = hash01(seed, i * 59 + 19, i * 43 + 31, 1381) * Math.PI * 2;
    blobs.push({ cx, cy, rx, ry, weight, angle });
  }

  for (let i = 0; i < minorCount; i += 1) {
    const cx = 0.5 + (hash01(seed, i * 47 + 5, i * 13 + 37, 1409) - 0.5) * 0.82;
    const cy = 0.5 + (hash01(seed, i * 29 + 29, i * 17 + 43, 1423) - 0.5) * 0.72;
    const rx = 0.06 + hash01(seed, i * 13 + 59, i * 19 + 11, 1433) * 0.11;
    const ry = 0.05 + hash01(seed, i * 31 + 73, i * 23 + 17, 1447) * 0.1;
    const weight = 0.22 + hash01(seed, i * 11 + 47, i * 41 + 19, 1459) * 0.34;
    const angle = hash01(seed, i * 71 + 23, i * 67 + 29, 1471) * Math.PI * 2;
    blobs.push({ cx, cy, rx, ry, weight, angle });
  }

  return blobs;
};

const sampleContinentMask = (u: number, v: number, blobs: ContinentBlob[]): number => {
  let sum = 0;
  let peak = 0;
  for (const blob of blobs) {
    const dxRaw = u - blob.cx;
    const dyRaw = v - blob.cy;
    const cosA = Math.cos(blob.angle);
    const sinA = Math.sin(blob.angle);
    const dx = (dxRaw * cosA + dyRaw * sinA) / blob.rx;
    const dy = (-dxRaw * sinA + dyRaw * cosA) / blob.ry;
    const d2 = dx * dx + dy * dy;
    const influence = Math.exp(-d2 * 1.9) * blob.weight;
    sum += influence;
    if (influence > peak) {
      peak = influence;
    }
  }
  return clamp(sum * 0.42 + peak * 0.58, 0, 1);
};

const applyOceanRim = (
  height: number[][],
  isLand: boolean[][],
  seaLevel: number,
  rimCells: number
) => {
  const cellsY = height.length;
  const cellsX = height[0]?.length ?? 0;
  const shallowSea = clamp(seaLevel - 0.025, 0, 1);
  const deepSea = clamp(seaLevel - 0.1, 0, 1);

  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      const dist = Math.min(x, cellsX - 1 - x, y, cellsY - 1 - y);
      if (dist >= rimCells) {
        continue;
      }
      const t = clamp(dist / Math.max(1, rimCells), 0, 1);
      const maxAllowed = lerp(deepSea, shallowSea, smootherstep(t));
      if (height[y][x] > maxAllowed) {
        height[y][x] = maxAllowed;
      }
      isLand[y][x] = false;
    }
  }
};

const smoothCoastalHeight = (
  height: number[][],
  seaLevel: number,
  iterations: number
) => {
  const cellsY = height.length;
  const cellsX = height[0]?.length ?? 0;
  if (cellsY === 0 || cellsX === 0) {
    return;
  }

  for (let step = 0; step < iterations; step += 1) {
    const next = make2D(cellsY, cellsX, (x, y) => height[y][x]);
    for (let y = 0; y < cellsY; y += 1) {
      for (let x = 0; x < cellsX; x += 1) {
        const here = height[y][x];
        const neighbors = getNeighbors(x, y, cellsX, cellsY);
        if (neighbors.length === 0) {
          continue;
        }

        let sum = here * 2.1;
        let seaCount = 0;
        let landCount = 0;
        for (const n of neighbors) {
          const nh = height[n.y][n.x];
          sum += nh;
          if (nh > seaLevel) {
            landCount += 1;
          } else {
            seaCount += 1;
          }
        }

        const mixed = sum / (neighbors.length + 2.1);
        const isCoast = seaCount > 0 && landCount > 0;
        const nearCoastBand = Math.abs(here - seaLevel) < 0.08;
        if (!isCoast && !nearCoastBand) {
          continue;
        }

        let value = lerp(here, mixed, isCoast ? 0.48 : 0.24);
        if (here > seaLevel && landCount <= 2) {
          value -= 0.022;
        }
        if (here <= seaLevel && landCount >= neighbors.length - 1) {
          value += 0.014;
        }
        next[y][x] = clamp(value, 0, 1);
      }
    }

    for (let y = 0; y < cellsY; y += 1) {
      for (let x = 0; x < cellsX; x += 1) {
        height[y][x] = next[y][x];
      }
    }
  }
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
  const river = make2D(cellsY, cellsX, () => false);

  const sources: Array<{ x: number; y: number; score: number }> = [];
  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      if (!isLand[y][x]) {
        continue;
      }
      const altitude = height[y][x];
      const wetness = moisture[y][x];
      if (altitude > seaLevel + 0.16 && wetness > 0.5) {
        const variance = hash01(seed, x, y, 909);
        sources.push({
          x,
          y,
          score: altitude * 0.7 + wetness * 0.3 + variance * 0.05,
        });
      }
    }
  }

  sources.sort((a, b) => b.score - a.score);
  const sourceCount = clamp(Math.floor((cellsX * cellsY) / 900), 8, 40);

  for (let i = 0; i < Math.min(sourceCount, sources.length); i += 1) {
    const source = sources[i];
    let cx = source.x;
    let cy = source.y;
    const visited = new Set<string>();

    for (let step = 0; step < 240; step += 1) {
      const key = `${cx},${cy}`;
      if (visited.has(key)) {
        break;
      }
      visited.add(key);
      river[cy][cx] = true;

      if (!isLand[cy][cx] || height[cy][cx] <= seaLevel + 0.008) {
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

export const generateMapLayers = (options: MapGeneratorOptions): GeneratedMapLayers => {
  const cellsX = clamp(options.cellsX ?? 120, 48, 220);
  const cellsY = clamp(options.cellsY ?? 60, 32, 140);

  const seaLevel = clamp(options.seaLevel, 0, 1);

  const height = make2D(cellsY, cellsX, () => 0);
  const moisture = make2D(cellsY, cellsX, () => 0);
  const temperature = make2D(cellsY, cellsX, () => 0);
  const isLand = make2D(cellsY, cellsX, () => false);
  const biome = make2D<BiomeKind>(cellsY, cellsX, () => "ocean");

  const climateTempShift =
    options.climatePreset === "cold" ? -0.16 : options.climatePreset === "arid" ? 0.08 : 0;
  const climateMoistShift =
    options.climatePreset === "arid" ? -0.2 : options.climatePreset === "cold" ? -0.06 : 0;
  const continentBlobs = buildContinentBlobs(options.seed);
  const rimCells = Math.max(3, Math.floor(Math.min(cellsX, cellsY) * 0.08));

  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      const ux = x / Math.max(1, cellsX - 1);
      const uy = y / Math.max(1, cellsY - 1);
      const nx = ux - 0.5;
      const ny = uy - 0.5;
      const distanceFromCenter = Math.sqrt(nx * nx + ny * ny);

      const warpX = fbm2D(options.seed, ux, uy, 1.6, 3, 2.15, 0.52, 17) * 2 - 1;
      const warpY = fbm2D(options.seed, ux, uy, 1.6, 3, 2.15, 0.52, 29) * 2 - 1;
      const wx = ux + warpX * 0.08;
      const wy = uy + warpY * 0.08;

      const continental = fbm2D(options.seed, wx, wy, 0.96, 5, 2.0, 0.52, 101);
      const regional = fbm2D(options.seed, wx, wy, 2.15, 4, 2.05, 0.54, 219);
      const detail = fbm2D(options.seed, wx, wy, 5.1, 4, 2.0, 0.52, 303);
      const ridgeRaw = fbm2D(options.seed, wx, wy, 7.8, 3, 2.0, 0.55, 505);
      const ridge = 1 - Math.abs(ridgeRaw * 2 - 1);
      const continentMaskRaw = sampleContinentMask(wx, wy, continentBlobs);
      const continentMask = smoothstep(clamp((continentMaskRaw - 0.24) / 0.55, 0, 1));
      const edgeDistance = Math.min(ux, 1 - ux, uy, 1 - uy);
      const edgeMask = smootherstep(clamp((edgeDistance - 0.04) / 0.28, 0, 1));
      const edgePenalty = 1 - edgeMask;
      const coastCutNoise = fbm2D(options.seed, wx, wy, 6.3, 3, 2.0, 0.5, 1259);
      const riftNoise = Math.abs(
        fbm2D(options.seed, wx + 0.17, wy - 0.09, 2.9, 4, 2.0, 0.54, 1211) * 2 - 1
      );

      let altitude =
        continental * 0.24 +
        regional * 0.2 +
        detail * 0.14 +
        ridge * 0.1 +
        continentMask * 0.34;
      altitude = altitude - distanceFromCenter * 0.08;
      altitude = altitude - edgePenalty * edgePenalty * 0.84 + edgeMask * 0.07 + 0.03;
      const coastAffinity = clamp(1 - Math.abs(continentMask - 0.46) / 0.46, 0, 1);
      altitude -= Math.max(0, coastCutNoise - 0.6) * coastAffinity * 0.2;
      altitude -= Math.max(0, riftNoise - 0.72) * 0.28;
      altitude = Math.pow(clamp(altitude, 0, 1), 1.16);
      altitude = clamp(altitude, 0, 1);

      const latitude = 1 - Math.abs(uy * 2 - 1);
      const altitudeNorm = clamp(
        (altitude - seaLevel) / Math.max(0.001, 1 - seaLevel),
        0,
        1
      );
      const humidityMacro = fbm2D(options.seed, wx, wy, 1.05, 4, 2.0, 0.56, 1501);
      const humidityDetail = fbm2D(options.seed, wx, wy, 4.25, 3, 2.0, 0.54, 1511);
      const humidityBand = fbm2D(options.seed, wx, wy, 0.74, 3, 2.0, 0.5, 1523) * 2 - 1;
      const dryPocket = Math.max(0, fbm2D(options.seed, wx, wy, 2.45, 3, 2.0, 0.55, 1543) - 0.63);
      const wetPocket = Math.max(0, fbm2D(options.seed, wx, wy, 2.1, 3, 2.0, 0.54, 1559) - 0.65);
      let wetness =
        humidityMacro * 0.42 +
        humidityDetail * 0.22 +
        latitude * 0.16 +
        (1 - altitudeNorm) * 0.14 +
        humidityBand * 0.14 -
        dryPocket * 0.23 +
        wetPocket * 0.2;
      wetness = clamp(wetness + climateMoistShift, 0, 1);

      const heatMacro = fbm2D(options.seed, wx + 0.08, wy - 0.04, 0.88, 4, 2.0, 0.54, 1601) * 2 - 1;
      const heatDetail = fbm2D(options.seed, wx, wy, 3.1, 3, 2.0, 0.53, 1613) * 2 - 1;
      let heat =
        latitude * 0.63 +
        0.22 +
        heatMacro * 0.14 +
        heatDetail * 0.09 -
        Math.max(0, altitudeNorm - 0.22) * 0.46;
      heat = clamp(heat + climateTempShift, 0, 1);

      const land = altitude > seaLevel;
      const tileBiome = classifyBiome(land, altitude, seaLevel, wetness, heat);

      height[y][x] = altitude;
      moisture[y][x] = wetness;
      temperature[y][x] = heat;
      isLand[y][x] = land;
      biome[y][x] = tileBiome;
    }
  }

  applyOceanRim(height, isLand, seaLevel, rimCells);
  smoothCoastalHeight(height, seaLevel, 2);

  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      const mountainBase = clamp(seaLevel + 0.22, 0, 1);
      let altitude = height[y][x];
      if (altitude > mountainBase) {
        altitude = mountainBase + (altitude - mountainBase) * 0.38;
      }
      height[y][x] = clamp(altitude, 0, 1);
      const land = altitude > seaLevel && isLand[y][x];
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
    cellsX,
    cellsY,
    height,
    moisture,
    temperature,
    isLand,
    biome,
    river,
  };
};
