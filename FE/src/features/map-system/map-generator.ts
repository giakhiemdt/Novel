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
  options: MapGeneratorOptions;
};

export type MapGeneratorWorkerResponse = {
  requestId: number;
  layers: GeneratedMapLayers;
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

const fractalNoise = (
  seed: string,
  x: number,
  y: number,
  scale = 1,
  salt = 0
): number => {
  const x1 = Math.floor((x * scale) / 3);
  const y1 = Math.floor((y * scale) / 3);
  const x2 = Math.floor((x * scale) / 7);
  const y2 = Math.floor((y * scale) / 7);
  const x3 = Math.floor((x * scale) / 13);
  const y3 = Math.floor((y * scale) / 13);

  const n1 = hash01(seed, x1, y1, salt + 11);
  const n2 = hash01(seed, x2, y2, salt + 23);
  const n3 = hash01(seed, x3, y3, salt + 37);
  return n1 * 0.55 + n2 * 0.3 + n3 * 0.15;
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

  if (altitude <= seaLevel + 0.018) {
    return "beach";
  }

  if (altitude > 0.9) {
    return temperature < 0.28 ? "snow" : "rock";
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
  const widthScale = Math.max(1, Math.floor(options.width / cellsX));
  const heightScale = Math.max(1, Math.floor(options.height / cellsY));

  const height = make2D(cellsY, cellsX, () => 0);
  const moisture = make2D(cellsY, cellsX, () => 0);
  const temperature = make2D(cellsY, cellsX, () => 0);
  const isLand = make2D(cellsY, cellsX, () => false);
  const biome = make2D<BiomeKind>(cellsY, cellsX, () => "ocean");

  const climateTempShift =
    options.climatePreset === "cold" ? -0.16 : options.climatePreset === "arid" ? 0.08 : 0;
  const climateMoistShift =
    options.climatePreset === "arid" ? -0.2 : options.climatePreset === "cold" ? -0.06 : 0;

  for (let y = 0; y < cellsY; y += 1) {
    for (let x = 0; x < cellsX; x += 1) {
      const sampleX = x * widthScale;
      const sampleY = y * heightScale;

      const nx = x / (cellsX - 1) - 0.5;
      const ny = y / (cellsY - 1) - 0.5;
      const distanceFromCenter = Math.sqrt(nx * nx + ny * ny);

      const continental = fractalNoise(options.seed, sampleX, sampleY, 1, 101);
      const detail = fractalNoise(options.seed, sampleX, sampleY, 2.7, 303);
      const ridge = fractalNoise(options.seed, sampleX, sampleY, 4.2, 505);

      let altitude = continental * 0.58 + detail * 0.28 + ridge * 0.14;
      altitude = altitude - distanceFromCenter * 0.52 + 0.22;
      altitude = clamp(altitude, 0, 1);

      const latitude = 1 - Math.abs((y / (cellsY - 1)) * 2 - 1);
      let wetness =
        fractalNoise(options.seed, sampleX, sampleY, 2, 707) * 0.65 +
        latitude * 0.2 +
        (1 - Math.max(0, altitude - seaLevel)) * 0.15;
      wetness = clamp(wetness + climateMoistShift, 0, 1);

      let heat =
        latitude * 0.72 +
        fractalNoise(options.seed, sampleX, sampleY, 1.6, 809) * 0.28 -
        Math.max(0, altitude - 0.55) * 0.34;
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
