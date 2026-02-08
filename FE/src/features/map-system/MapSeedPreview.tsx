import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  type BiomeKind,
  type ClimatePreset,
  type GeneratedMapLayers,
  type MapGeneratorWorkerRequest,
  type MapGeneratorWorkerResponse,
  createMapCacheKey,
  generateMapLayers,
} from "./map-generator";

export type MapSeedPreviewProps = {
  seed: string;
  width: number;
  height: number;
  seaLevel: number;
  climatePreset: string;
  title: string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const biomeColorMap: Record<BiomeKind, string> = {
  ocean: "#3f78a4",
  beach: "#cbb989",
  snow: "#e8eff7",
  tundra: "#b3bdc6",
  taiga: "#6d8f7a",
  grassland: "#8cb56f",
  forest: "#5e8f54",
  rainforest: "#3c7d4f",
  desert: "#cfb177",
  savanna: "#afab68",
  rock: "#7d7d7d",
};

const heightColor = (altitude: number, seaLevel: number): string => {
  if (altitude <= seaLevel) {
    const depth = clamp((seaLevel - altitude) / Math.max(0.001, seaLevel), 0, 1);
    if (depth > 0.72) return "#1b3f63";
    if (depth > 0.4) return "#2f6793";
    return "#63a7cf";
  }
  const landLevel = clamp(
    (altitude - seaLevel) / Math.max(0.001, 1 - seaLevel),
    0,
    1
  );
  if (landLevel > 0.84) return "#95979d";
  if (landLevel > 0.58) return "#8aa36f";
  if (landLevel > 0.22) return "#75a765";
  return "#bfb680";
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const value = hex.replace("#", "");
  const normalized =
    value.length === 3 ? value.split("").map((c) => `${c}${c}`).join("") : value;
  const parsed = Number.parseInt(normalized, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (v: number) =>
    clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const mixColor = (base: string, overlay: string, ratio: number): string => {
  const safeRatio = clamp(ratio, 0, 1);
  const b = hexToRgb(base);
  const o = hexToRgb(overlay);
  return rgbToHex(
    b.r + (o.r - b.r) * safeRatio,
    b.g + (o.g - b.g) * safeRatio,
    b.b + (o.b - b.b) * safeRatio
  );
};

const normalizeClimate = (value: string): ClimatePreset => {
  if (value === "arid" || value === "cold") {
    return value;
  }
  return "temperate";
};

const sampleBilinear = (matrix: number[][], u: number, v: number): number => {
  const rows = matrix.length;
  const cols = matrix[0]?.length ?? 0;
  if (rows === 0 || cols === 0) {
    return 0;
  }
  const x = clamp(u, 0, 1) * (cols - 1);
  const y = clamp(v, 0, 1) * (rows - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(cols - 1, x0 + 1);
  const y1 = Math.min(rows - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;

  const v00 = matrix[y0][x0];
  const v10 = matrix[y0][x1];
  const v01 = matrix[y1][x0];
  const v11 = matrix[y1][x1];

  const top = v00 + (v10 - v00) * tx;
  const bottom = v01 + (v11 - v01) * tx;
  return top + (bottom - top) * ty;
};

const classifyBiome = (
  altitude: number,
  seaLevel: number,
  moisture: number,
  temperature: number
): BiomeKind => {
  if (altitude <= seaLevel) {
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

type TrianglePoint = { x: number; y: number };
type MeshPoint = TrianglePoint & { r: number };
type MeshFace = { a: number; b: number; c: number };
type CircumTriangle = {
  a: number;
  b: number;
  c: number;
  cx: number;
  cy: number;
  r2: number;
};

const sampleLandDensity = (
  heightMap: number[][],
  seaLevel: number,
  u: number,
  v: number
): number => {
  const offsets = [
    { du: 0, dv: 0, w: 0.3 },
    { du: -0.025, dv: 0, w: 0.1 },
    { du: 0.025, dv: 0, w: 0.1 },
    { du: 0, dv: -0.025, w: 0.1 },
    { du: 0, dv: 0.025, w: 0.1 },
    { du: -0.04, dv: -0.02, w: 0.075 },
    { du: 0.04, dv: -0.02, w: 0.075 },
    { du: -0.04, dv: 0.02, w: 0.075 },
    { du: 0.04, dv: 0.02, w: 0.075 },
  ];

  let sum = 0;
  for (const item of offsets) {
    const a = sampleBilinear(heightMap, u + item.du, v + item.dv);
    if (a > seaLevel) {
      sum += item.w;
    }
  }
  return clamp(sum, 0, 1);
};

const hashString32 = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const createSeededRng = (seed: string) => {
  let state = hashString32(seed) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const buildAdaptiveMeshPoints = (
  layers: GeneratedMapLayers,
  seaLevel: number,
  width: number,
  height: number,
  seed: string
): MeshPoint[] => {
  const rng = createSeededRng(`${seed}|mesh`);
  const points: MeshPoint[] = [];
  const cellSize = 6;
  const gridCols = Math.ceil(width / cellSize) + 2;
  const gridRows = Math.ceil(height / cellSize) + 2;
  const grid: number[][] = Array.from({ length: gridCols * gridRows }, () => []);
  const maxRadius = 28;
  const neighborRange = Math.ceil(maxRadius / cellSize) + 1;

  const gridIndex = (x: number, y: number) => {
    const gx = clamp(Math.floor(x / cellSize), 0, gridCols - 1);
    const gy = clamp(Math.floor(y / cellSize), 0, gridRows - 1);
    return gy * gridCols + gx;
  };

  const canPlace = (x: number, y: number, r: number): boolean => {
    const cx = clamp(Math.floor(x / cellSize), 0, gridCols - 1);
    const cy = clamp(Math.floor(y / cellSize), 0, gridRows - 1);
    for (let gy = cy - neighborRange; gy <= cy + neighborRange; gy += 1) {
      if (gy < 0 || gy >= gridRows) {
        continue;
      }
      for (let gx = cx - neighborRange; gx <= cx + neighborRange; gx += 1) {
        if (gx < 0 || gx >= gridCols) {
          continue;
        }
        const bucket = grid[gy * gridCols + gx];
        for (const index of bucket) {
          const p = points[index];
          const minDist = Math.min(r, p.r) * 0.92;
          const dx = x - p.x;
          const dy = y - p.y;
          if (dx * dx + dy * dy < minDist * minDist) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const pushPoint = (x: number, y: number, r: number) => {
    const clampedX = clamp(x, 0, width);
    const clampedY = clamp(y, 0, height);
    if (!canPlace(clampedX, clampedY, r)) {
      return;
    }
    const index = points.length;
    points.push({ x: clampedX, y: clampedY, r });
    grid[gridIndex(clampedX, clampedY)].push(index);
  };

  const borderStep = 52;
  for (let x = 0; x <= width; x += borderStep) {
    pushPoint(x, 0, 24);
    pushPoint(x, height, 24);
  }
  for (let y = 0; y <= height; y += borderStep) {
    pushPoint(0, y, 24);
    pushPoint(width, y, 24);
  }
  pushPoint(0, 0, 24);
  pushPoint(width, 0, 24);
  pushPoint(0, height, 24);
  pushPoint(width, height, 24);

  const targetCount = clamp(Math.floor((width * height) / 260), 550, 1600);
  const attemptLimit = targetCount * 35;

  for (let attempts = 0; attempts < attemptLimit && points.length < targetCount; attempts += 1) {
    const x = rng() * width;
    const y = rng() * height;
    const u = x / Math.max(1, width - 1);
    const v = y / Math.max(1, height - 1);
    const altitude = sampleBilinear(layers.height, u, v);
    const landDensity = sampleLandDensity(layers.height, seaLevel, u, v);
    const altNorm = clamp(
      (altitude - seaLevel) / Math.max(0.001, 1 - seaLevel),
      0,
      1
    );
    const coastFactor = 1 - clamp(Math.abs(altitude - seaLevel) / 0.08, 0, 1);
    const detail = clamp(
      landDensity * 0.55 + altNorm * 0.3 + coastFactor * 0.35,
      0,
      1
    );
    const acceptProb = 0.08 + detail * 0.92;
    if (rng() > acceptProb) {
      continue;
    }

    const r = clamp(26 - detail * 20, 4.8, 26);
    pushPoint(x, y, r);
  }

  return points;
};

const makeCircumTriangle = (
  points: TrianglePoint[],
  a: number,
  b: number,
  c: number
): CircumTriangle | null => {
  const p1 = points[a];
  const p2 = points[b];
  const p3 = points[c];

  const d =
    2 *
    (p1.x * (p2.y - p3.y) +
      p2.x * (p3.y - p1.y) +
      p3.x * (p1.y - p2.y));

  if (Math.abs(d) < 1e-9) {
    return null;
  }

  const p1Sq = p1.x * p1.x + p1.y * p1.y;
  const p2Sq = p2.x * p2.x + p2.y * p2.y;
  const p3Sq = p3.x * p3.x + p3.y * p3.y;

  const cx =
    (p1Sq * (p2.y - p3.y) +
      p2Sq * (p3.y - p1.y) +
      p3Sq * (p1.y - p2.y)) /
    d;
  const cy =
    (p1Sq * (p3.x - p2.x) +
      p2Sq * (p1.x - p3.x) +
      p3Sq * (p2.x - p1.x)) /
    d;

  const dx = p1.x - cx;
  const dy = p1.y - cy;
  const r2 = dx * dx + dy * dy;

  return { a, b, c, cx, cy, r2 };
};

const triangulateAdaptiveMesh = (
  points: MeshPoint[],
  width: number,
  height: number
): MeshFace[] => {
  const baseCount = points.length;
  if (baseCount < 3) {
    return [];
  }

  const all: TrianglePoint[] = points.map((p) => ({ x: p.x, y: p.y }));
  const margin = Math.max(width, height) * 6;
  const s0 = all.length;
  all.push({ x: -margin, y: -margin });
  const s1 = all.length;
  all.push({ x: width + margin, y: -margin });
  const s2 = all.length;
  all.push({ x: width * 0.5, y: height + margin });

  const superTri = makeCircumTriangle(all, s0, s1, s2);
  if (!superTri) {
    return [];
  }

  let triangles: CircumTriangle[] = [superTri];

  for (let i = 0; i < baseCount; i += 1) {
    const p = all[i];
    const badIndices: number[] = [];
    for (let ti = 0; ti < triangles.length; ti += 1) {
      const tri = triangles[ti];
      const dx = p.x - tri.cx;
      const dy = p.y - tri.cy;
      if (dx * dx + dy * dy <= tri.r2) {
        badIndices.push(ti);
      }
    }

    if (badIndices.length === 0) {
      continue;
    }

    const edgeMap = new Map<string, { a: number; b: number; count: number }>();
    const addEdge = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        edgeMap.set(key, { a, b, count: 1 });
      }
    };

    for (const index of badIndices) {
      const tri = triangles[index];
      addEdge(tri.a, tri.b);
      addEdge(tri.b, tri.c);
      addEdge(tri.c, tri.a);
    }

    const badSet = new Set(badIndices);
    triangles = triangles.filter((_, index) => !badSet.has(index));

    for (const edge of edgeMap.values()) {
      if (edge.count !== 1) {
        continue;
      }
      const newTri = makeCircumTriangle(all, edge.a, edge.b, i);
      if (newTri) {
        triangles.push(newTri);
      }
    }
  }

  return triangles
    .filter(
      (tri) =>
        tri.a < baseCount && tri.b < baseCount && tri.c < baseCount
    )
    .map((tri) => ({ a: tri.a, b: tri.b, c: tri.c }));
};

const MAX_LOCAL_CACHE_SIZE = 20;

export const MapSeedPreview = ({
  seed,
  width,
  height,
  seaLevel,
  climatePreset,
  title,
}: MapSeedPreviewProps) => {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const activeRequestIdRef = useRef(0);
  const localCacheRef = useRef(new Map<string, GeneratedMapLayers>());
  const meshCacheRef = useRef(
    new Map<string, { points: MeshPoint[]; faces: MeshFace[] }>()
  );
  const latestOptionsRef = useRef<{
    seed: string;
    width: number;
    height: number;
    seaLevel: number;
    climatePreset: ClimatePreset;
  } | null>(null);

  const [showHeight, setShowHeight] = useState(true);
  const [showBiomes, setShowBiomes] = useState(true);
  const [showRivers, setShowRivers] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [layers, setLayers] = useState<GeneratedMapLayers | null>(null);

  const safeWidth = clamp(width, 64, 4096);
  const safeHeight = clamp(height, 64, 4096);
  const safeSeaLevel = clamp(seaLevel, 0, 1);

  const options = useMemo(
    () => ({
      seed: seed.trim() || "default-seed",
      width: safeWidth,
      height: safeHeight,
      seaLevel: safeSeaLevel,
      climatePreset: normalizeClimate(climatePreset),
    }),
    [seed, safeWidth, safeHeight, safeSeaLevel, climatePreset]
  );
  const cacheKey = useMemo(() => createMapCacheKey(options), [options]);

  useEffect(() => {
    latestOptionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (typeof Worker === "undefined") {
      return;
    }

    try {
      const worker = new Worker(
        new URL("./map-generator.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = (event: MessageEvent<MapGeneratorWorkerResponse>) => {
        const payload = event.data;
        if (!payload || payload.requestId !== activeRequestIdRef.current) {
          return;
        }
        if (payload.cacheKey) {
          if (localCacheRef.current.has(payload.cacheKey)) {
            localCacheRef.current.delete(payload.cacheKey);
          }
          localCacheRef.current.set(payload.cacheKey, payload.layers);
          if (localCacheRef.current.size > MAX_LOCAL_CACHE_SIZE) {
            const oldestKey = localCacheRef.current.keys().next().value;
            if (typeof oldestKey === "string") {
              localCacheRef.current.delete(oldestKey);
            }
          }
        }
        setLayers(payload.layers);
        setIsGenerating(false);
      };

      worker.onerror = () => {
        const fallbackOptions = latestOptionsRef.current;
        if (!fallbackOptions) {
          setIsGenerating(false);
          return;
        }
        const fallbackKey = createMapCacheKey(fallbackOptions);
        const computed = generateMapLayers(fallbackOptions);
        if (localCacheRef.current.has(fallbackKey)) {
          localCacheRef.current.delete(fallbackKey);
        }
        localCacheRef.current.set(fallbackKey, computed);
        if (localCacheRef.current.size > MAX_LOCAL_CACHE_SIZE) {
          const oldestKey = localCacheRef.current.keys().next().value;
          if (typeof oldestKey === "string") {
            localCacheRef.current.delete(oldestKey);
          }
        }
        setLayers(computed);
        setIsGenerating(false);
      };

      workerRef.current = worker;
    } catch {
      workerRef.current = null;
    }

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;

    const localCached = localCacheRef.current.get(cacheKey);
    if (localCached) {
      localCacheRef.current.delete(cacheKey);
      localCacheRef.current.set(cacheKey, localCached);
      setLayers(localCached);
      setIsGenerating(false);
      return;
    }

    setIsGenerating(true);

    const worker = workerRef.current;
    if (!worker) {
      const computed = generateMapLayers(options);
      localCacheRef.current.set(cacheKey, computed);
      if (localCacheRef.current.size > MAX_LOCAL_CACHE_SIZE) {
        const oldestKey = localCacheRef.current.keys().next().value;
        if (typeof oldestKey === "string") {
          localCacheRef.current.delete(oldestKey);
        }
      }
      setLayers(computed);
      setIsGenerating(false);
      return;
    }

    const payload: MapGeneratorWorkerRequest = {
      requestId,
      cacheKey,
      options,
    };
    worker.postMessage(payload);
  }, [options, cacheKey]);

  useEffect(() => {
    if (!layers) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const previewWidth = 720;
    const previewHeight = 360;
    canvas.width = previewWidth;
    canvas.height = previewHeight;

    ctx.clearRect(0, 0, previewWidth, previewHeight);

    const sampleColorAt = (u: number, v: number): string => {
      const altitude = sampleBilinear(layers.height, u, v);
      const moisture = sampleBilinear(layers.moisture, u, v);
      const temperature = sampleBilinear(layers.temperature, u, v);
      const isLand = altitude > options.seaLevel;
      const biome = classifyBiome(
        altitude,
        options.seaLevel,
        moisture,
        temperature
      );

      let color = showBiomes
        ? biomeColorMap[biome]
        : heightColor(altitude, options.seaLevel);

      if (showBiomes && showHeight) {
        if (isLand) {
          const relief = clamp((altitude - options.seaLevel) * 0.45, 0, 0.32);
          color = mixColor(color, "#222831", relief);
        } else {
          const depth = clamp(
            (options.seaLevel - altitude) / Math.max(0.001, options.seaLevel),
            0,
            1
          );
          color = mixColor(color, "#10243a", depth * 0.4);
        }
      }
      return color;
    };

    const meshKey = `${cacheKey}|mesh-random-v1|${previewWidth}x${previewHeight}`;
    let mesh = meshCacheRef.current.get(meshKey);
    if (!mesh) {
      const points = buildAdaptiveMeshPoints(
        layers,
        options.seaLevel,
        previewWidth,
        previewHeight,
        options.seed
      );
      const faces = triangulateAdaptiveMesh(points, previewWidth, previewHeight);
      mesh = { points, faces };
      if (meshCacheRef.current.has(meshKey)) {
        meshCacheRef.current.delete(meshKey);
      }
      meshCacheRef.current.set(meshKey, mesh);
      if (meshCacheRef.current.size > 8) {
        const oldestKey = meshCacheRef.current.keys().next().value;
        if (typeof oldestKey === "string") {
          meshCacheRef.current.delete(oldestKey);
        }
      }
    } else {
      meshCacheRef.current.delete(meshKey);
      meshCacheRef.current.set(meshKey, mesh);
    }

    for (const face of mesh.faces) {
      const p1 = mesh.points[face.a];
      const p2 = mesh.points[face.b];
      const p3 = mesh.points[face.c];
      const cx = (p1.x + p2.x + p3.x) / 3;
      const cy = (p1.y + p2.y + p3.y) / 3;
      const u = clamp(cx / Math.max(1, previewWidth - 1), 0, 1);
      const v = clamp(cy / Math.max(1, previewHeight - 1), 0, 1);
      const altitude = sampleBilinear(layers.height, u, v);
      const fillBase = sampleColorAt(u, v);

      const jitterRaw = Math.sin((cx + 17.3) * 12.9898 + (cy + 9.1) * 78.233);
      const jitter01 = jitterRaw - Math.floor(jitterRaw);
      const jitter = (jitter01 - 0.5) * 0.08;
      const fill =
        jitter >= 0
          ? mixColor(fillBase, "#ffffff", jitter)
          : mixColor(fillBase, "#0b1a25", -jitter);

      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();

      const altNorm = clamp(
        (altitude - options.seaLevel) / Math.max(0.001, 1 - options.seaLevel),
        0,
        1
      );
      const strokeAlpha = 0.025 + altNorm * 0.14;
      const strokeWidth = 0.12 + altNorm * 0.68;
      ctx.strokeStyle = `rgba(13, 27, 40, ${strokeAlpha})`;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }

    const cellW = previewWidth / layers.cellsX;
    const cellH = previewHeight / layers.cellsY;

    if (showRivers) {
      ctx.strokeStyle = "rgba(102, 202, 255, 0.92)";
      ctx.lineWidth = Math.max(1, Math.min(cellW, cellH) * 0.35);
      ctx.lineCap = "round";

      for (let y = 0; y < layers.cellsY; y += 1) {
        for (let x = 0; x < layers.cellsX; x += 1) {
          if (!layers.river[y][x]) {
            continue;
          }

          const cx = x * cellW + cellW / 2;
          const cy = y * cellH + cellH / 2;
          let linked = false;

          const right = x + 1;
          if (right < layers.cellsX && layers.river[y][right]) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(right * cellW + cellW / 2, cy);
            ctx.stroke();
            linked = true;
          }

          const down = y + 1;
          if (down < layers.cellsY && layers.river[down][x]) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, down * cellH + cellH / 2);
            ctx.stroke();
            linked = true;
          }

          if (!linked) {
            ctx.fillStyle = "rgba(102, 202, 255, 0.95)";
            ctx.beginPath();
            ctx.arc(
              cx,
              cy,
              Math.max(0.7, Math.min(cellW, cellH) * 0.25),
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
    }

    ctx.strokeStyle = "rgba(15, 23, 42, 0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, previewWidth - 1, previewHeight - 1);
  }, [
    cacheKey,
    layers,
    options.seaLevel,
    options.seed,
    showBiomes,
    showHeight,
    showRivers,
  ]);

  return (
    <div className="map-seed-preview">
      <div className="map-seed-preview__head">
        <div className="map-seed-preview__meta">
          <strong>{title}</strong>
          <span className="header__subtitle">
            {t("Seed")}: {options.seed} | {options.width}x{options.height} | {t("Sea Level")}: {options.seaLevel}
          </span>
          {isGenerating && (
            <span className="map-seed-preview__status">{t("Generating map...")}</span>
          )}
        </div>
        <div className="map-seed-preview__layers" aria-label={t("Layers")}>
          <button
            type="button"
            className={`map-layer-chip${showHeight ? " map-layer-chip--active" : ""}`}
            onClick={() => setShowHeight((prev) => !prev)}
          >
            {t("Height")}
          </button>
          <button
            type="button"
            className={`map-layer-chip${showBiomes ? " map-layer-chip--active" : ""}`}
            onClick={() => setShowBiomes((prev) => !prev)}
          >
            {t("Biomes")}
          </button>
          <button
            type="button"
            className={`map-layer-chip${showRivers ? " map-layer-chip--active" : ""}`}
            onClick={() => setShowRivers((prev) => !prev)}
          >
            {t("Rivers")}
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="map-seed-preview__canvas"
        aria-busy={isGenerating}
      />
    </div>
  );
};
