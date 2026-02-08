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
  if (altitude <= seaLevel + 0.012) {
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
type MeshCell = { site: number; vertices: TrianglePoint[] };
type CircumTriangle = {
  a: number;
  b: number;
  c: number;
  cx: number;
  cy: number;
  r2: number;
};
type MeshQuality = "low" | "medium" | "high";

const QUALITY_SETTINGS: Record<
  MeshQuality,
  {
    targetPoints: number;
    minRadius: number;
    maxRadius: number;
    coastResolution: { cols: number; rows: number };
    meshLineAlpha: number;
    meshLineWidth: number;
  }
> = {
  low: {
    targetPoints: 1800,
    minRadius: 4.9,
    maxRadius: 20,
    coastResolution: { cols: 92, rows: 46 },
    meshLineAlpha: 0.1,
    meshLineWidth: 0.52,
  },
  medium: {
    targetPoints: 3200,
    minRadius: 3.9,
    maxRadius: 15.5,
    coastResolution: { cols: 132, rows: 66 },
    meshLineAlpha: 0.09,
    meshLineWidth: 0.46,
  },
  high: {
    targetPoints: 5000,
    minRadius: 2.95,
    maxRadius: 12.5,
    coastResolution: { cols: 186, rows: 93 },
    meshLineAlpha: 0.075,
    meshLineWidth: 0.38,
  },
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
  seed: string,
  quality: MeshQuality
): MeshPoint[] => {
  const setting = QUALITY_SETTINGS[quality];
  const rng = createSeededRng(`${seed}|mesh`);
  const points: MeshPoint[] = [];
  const cellSize = quality === "high" ? 5 : quality === "medium" ? 6 : 7;
  const gridCols = Math.ceil(width / cellSize) + 2;
  const gridRows = Math.ceil(height / cellSize) + 2;
  const grid: number[][] = Array.from({ length: gridCols * gridRows }, () => []);
  const maxRadius = setting.maxRadius + 2;
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

  const borderStep = quality === "high" ? 36 : quality === "medium" ? 46 : 56;
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

  const areaFactor = (width * height) / (720 * 360);
  const targetCount = clamp(
    Math.floor(setting.targetPoints * areaFactor),
    Math.floor(setting.targetPoints * 0.65),
    Math.floor(setting.targetPoints * 1.65)
  );
  const attemptLimit = targetCount * 38;

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

    const r = clamp(
      setting.maxRadius - detail * (setting.maxRadius - setting.minRadius),
      setting.minRadius,
      setting.maxRadius
    );
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

const buildVoronoiCells = (
  points: MeshPoint[],
  faces: MeshFace[],
  width: number,
  height: number
): MeshCell[] => {
  if (points.length === 0 || faces.length === 0) {
    return [];
  }
  const plainPoints: TrianglePoint[] = points.map((point) => ({
    x: point.x,
    y: point.y,
  }));
  const centers: Array<TrianglePoint | null> = faces.map((face) => {
    const circum = makeCircumTriangle(plainPoints, face.a, face.b, face.c);
    if (!circum) {
      const p1 = plainPoints[face.a];
      const p2 = plainPoints[face.b];
      const p3 = plainPoints[face.c];
      return {
        x: (p1.x + p2.x + p3.x) / 3,
        y: (p1.y + p2.y + p3.y) / 3,
      };
    }
    return {
      x: clamp(circum.cx, 0, width),
      y: clamp(circum.cy, 0, height),
    };
  });

  const faceRefs: number[][] = Array.from({ length: points.length }, () => []);
  faces.forEach((face, index) => {
    faceRefs[face.a].push(index);
    faceRefs[face.b].push(index);
    faceRefs[face.c].push(index);
  });

  const cells: MeshCell[] = [];
  for (let site = 0; site < points.length; site += 1) {
    const refs = faceRefs[site];
    if (refs.length < 3) {
      continue;
    }
    const origin = points[site];
    const uniqueRefs = Array.from(new Set(refs)).filter(
      (index) => centers[index] !== null
    );
    if (uniqueRefs.length < 3) {
      continue;
    }
    uniqueRefs.sort((a, b) => {
      const pa = centers[a]!;
      const pb = centers[b]!;
      const aa = Math.atan2(pa.y - origin.y, pa.x - origin.x);
      const ab = Math.atan2(pb.y - origin.y, pb.x - origin.x);
      return aa - ab;
    });

    const vertices: TrianglePoint[] = [];
    for (const index of uniqueRefs) {
      const p = centers[index]!;
      const x = clamp(p.x, 0, width);
      const y = clamp(p.y, 0, height);
      const last = vertices[vertices.length - 1];
      if (!last || (Math.abs(last.x - x) > 0.35 || Math.abs(last.y - y) > 0.35)) {
        vertices.push({ x, y });
      }
    }
    if (vertices.length < 3) {
      continue;
    }

    let area2 = 0;
    for (let i = 0; i < vertices.length; i += 1) {
      const a = vertices[i];
      const b = vertices[(i + 1) % vertices.length];
      area2 += a.x * b.y - b.x * a.y;
    }
    if (Math.abs(area2) < 2.5) {
      continue;
    }

    cells.push({ site, vertices });
  }

  return cells;
};

const interpolateZero = (
  p1: TrianglePoint,
  v1: number,
  p2: TrianglePoint,
  v2: number
): TrianglePoint => {
  const denom = v1 - v2;
  if (Math.abs(denom) < 1e-9) {
    return { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 };
  }
  const t = clamp(v1 / denom, 0, 1);
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
};

const drawSmoothCoastline = (
  ctx: CanvasRenderingContext2D,
  layers: GeneratedMapLayers,
  seaLevel: number,
  width: number,
  height: number,
  quality: MeshQuality
) => {
  const resolution = QUALITY_SETTINGS[quality].coastResolution;
  const cols = resolution.cols;
  const rows = resolution.rows;

  const scalar: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  );

  for (let j = 0; j < rows; j += 1) {
    const v = j / Math.max(1, rows - 1);
    for (let i = 0; i < cols; i += 1) {
      const u = i / Math.max(1, cols - 1);
      scalar[j][i] = sampleBilinear(layers.height, u, v) - seaLevel;
    }
  }

  const edgePoint = (
    edge: number,
    x: number,
    y: number,
    a: number,
    b: number,
    c: number,
    d: number
  ): TrianglePoint => {
    const pA = { x, y };
    const pB = { x: x + 1, y };
    const pC = { x: x + 1, y: y + 1 };
    const pD = { x, y: y + 1 };
    if (edge === 0) return interpolateZero(pA, a, pB, b);
    if (edge === 1) return interpolateZero(pB, b, pC, c);
    if (edge === 2) return interpolateZero(pD, d, pC, c);
    return interpolateZero(pA, a, pD, d);
  };

  const segmentsByCase: Record<number, Array<[number, number]>> = {
    0: [],
    1: [[3, 0]],
    2: [[0, 1]],
    3: [[3, 1]],
    4: [[1, 2]],
    5: [
      [3, 2],
      [0, 1],
    ],
    6: [[0, 2]],
    7: [[3, 2]],
    8: [[2, 3]],
    9: [[0, 2]],
    10: [
      [0, 1],
      [2, 3],
    ],
    11: [[1, 2]],
    12: [[3, 1]],
    13: [[0, 1]],
    14: [[3, 0]],
    15: [],
  };

  const sx = width / Math.max(1, cols - 1);
  const sy = height / Math.max(1, rows - 1);

  const traceCoastSegments = () => {
    ctx.beginPath();
    for (let j = 0; j < rows - 1; j += 1) {
      for (let i = 0; i < cols - 1; i += 1) {
        const a = scalar[j][i];
        const b = scalar[j][i + 1];
        const c = scalar[j + 1][i + 1];
        const d = scalar[j + 1][i];
        const mask =
          (a > 0 ? 1 : 0) |
          (b > 0 ? 2 : 0) |
          (c > 0 ? 4 : 0) |
          (d > 0 ? 8 : 0);

        const segments = segmentsByCase[mask];
        if (!segments || segments.length === 0) {
          continue;
        }

        for (const [e1, e2] of segments) {
          const p1 = edgePoint(e1, i, j, a, b, c, d);
          const p2 = edgePoint(e2, i, j, a, b, c, d);
          ctx.moveTo(p1.x * sx, p1.y * sy);
          ctx.lineTo(p2.x * sx, p2.y * sy);
        }
      }
    }
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.filter = quality === "high" ? "blur(1.8px)" : quality === "medium" ? "blur(1.45px)" : "blur(1.1px)";
  ctx.strokeStyle = "rgba(92, 159, 206, 0.34)";
  ctx.lineWidth = quality === "high" ? 5.8 : quality === "medium" ? 4.8 : 3.9;
  traceCoastSegments();
  ctx.stroke();

  ctx.filter = "none";
  ctx.strokeStyle = "rgba(37, 96, 142, 0.26)";
  ctx.lineWidth = quality === "high" ? 1.5 : quality === "medium" ? 1.35 : 1.2;
  traceCoastSegments();
  ctx.stroke();
  ctx.restore();
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
    new Map<string, { points: MeshPoint[]; faces: MeshFace[]; cells: MeshCell[] }>()
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
  const [meshQuality, setMeshQuality] = useState<MeshQuality>("medium");
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

    const qualitySetting = QUALITY_SETTINGS[meshQuality];

    const meshKey = `${cacheKey}|mesh-polygons-v1|q:${meshQuality}|${previewWidth}x${previewHeight}`;
    let mesh = meshCacheRef.current.get(meshKey);
    if (!mesh) {
      const points = buildAdaptiveMeshPoints(
        layers,
        options.seaLevel,
        previewWidth,
        previewHeight,
        options.seed,
        meshQuality
      );
      const faces = triangulateAdaptiveMesh(points, previewWidth, previewHeight);
      const cells = buildVoronoiCells(points, faces, previewWidth, previewHeight);
      mesh = { points, faces, cells };
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

    const paintCell = (vertices: TrianglePoint[]) => {
      let cx = 0;
      let cy = 0;
      for (const vertex of vertices) {
        cx += vertex.x;
        cy += vertex.y;
      }
      cx /= vertices.length;
      cy /= vertices.length;
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
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i += 1) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();
      ctx.fill();

      const altNorm = clamp(
        (altitude - options.seaLevel) / Math.max(0.001, 1 - options.seaLevel),
        0,
        1
      );
      const lineAlpha = qualitySetting.meshLineAlpha * (0.35 + altNorm * 0.65);
      ctx.strokeStyle = `rgba(13, 27, 40, ${lineAlpha})`;
      ctx.lineWidth = qualitySetting.meshLineWidth;
      ctx.stroke();
    };

    for (const cell of mesh.cells) {
      paintCell(cell.vertices);
    }

    drawSmoothCoastline(
      ctx,
      layers,
      options.seaLevel,
      previewWidth,
      previewHeight,
      meshQuality
    );

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
    meshQuality,
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
          <span className="map-seed-preview__label">{t("Mesh Quality")}</span>
          <button
            type="button"
            className={`map-layer-chip${meshQuality === "low" ? " map-layer-chip--active" : ""}`}
            onClick={() => setMeshQuality("low")}
          >
            {t("Low")}
          </button>
          <button
            type="button"
            className={`map-layer-chip${meshQuality === "medium" ? " map-layer-chip--active" : ""}`}
            onClick={() => setMeshQuality("medium")}
          >
            {t("Medium")}
          </button>
          <button
            type="button"
            className={`map-layer-chip${meshQuality === "high" ? " map-layer-chip--active" : ""}`}
            onClick={() => setMeshQuality("high")}
          >
            {t("High")}
          </button>
          <span className="map-seed-preview__label">{t("Layers")}</span>
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
