import type {
  BiomeKind,
  SimulationMeshBoundary,
  SimulationMeshBuildInput,
  SimulationMeshCell,
  SimulationMeshFace,
  SimulationMeshPoint,
  SimulationMeshQuality,
  SimulationMeshResult,
  SimulationPoint,
} from "./types";

type CircumTriangle = {
  a: number;
  b: number;
  c: number;
  cx: number;
  cy: number;
  r2: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

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

const sampleBiomeEdgeDensity = (
  biome: BiomeKind[][],
  cellsX: number,
  cellsY: number,
  u: number,
  v: number
): number => {
  const cx = clamp(Math.round(u * (cellsX - 1)), 0, cellsX - 1);
  const cy = clamp(Math.round(v * (cellsY - 1)), 0, cellsY - 1);
  const center = biome[cy][cx];
  let diff = 0;
  let total = 0;
  for (let oy = -1; oy <= 1; oy += 1) {
    for (let ox = -1; ox <= 1; ox += 1) {
      if (ox === 0 && oy === 0) {
        continue;
      }
      const x = cx + ox;
      const y = cy + oy;
      if (x < 0 || x >= cellsX || y < 0 || y >= cellsY) {
        continue;
      }
      total += 1;
      if (biome[y][x] !== center) {
        diff += 1;
      }
    }
  }
  if (total === 0) {
    return 0;
  }
  return clamp(diff / total, 0, 1);
};

const sampleHeightVariation = (heightMap: number[][], u: number, v: number): number => {
  const center = sampleBilinear(heightMap, u, v);
  const offsets = [
    { du: -0.012, dv: 0 },
    { du: 0.012, dv: 0 },
    { du: 0, dv: -0.012 },
    { du: 0, dv: 0.012 },
    { du: -0.018, dv: -0.011 },
    { du: 0.018, dv: -0.011 },
    { du: -0.018, dv: 0.011 },
    { du: 0.018, dv: 0.011 },
  ];
  let sum = 0;
  for (const item of offsets) {
    const next = sampleBilinear(heightMap, u + item.du, v + item.dv);
    sum += Math.abs(next - center);
  }
  const avgDelta = sum / offsets.length;
  return clamp(avgDelta * 9.5, 0, 1);
};

const MESH_QUALITY_SETTINGS: Record<
  SimulationMeshQuality,
  {
    targetPoints: number;
    minRadius: number;
    maxRadius: number;
  }
> = {
  low: {
    targetPoints: 3600,
    minRadius: 3.25,
    maxRadius: 12.8,
  },
  medium: {
    targetPoints: 6400,
    minRadius: 2.45,
    maxRadius: 9.8,
  },
  high: {
    targetPoints: 10000,
    minRadius: 1.78,
    maxRadius: 7.2,
  },
};

const buildAdaptiveMeshPoints = (
  input: SimulationMeshBuildInput
): SimulationMeshPoint[] => {
  const { layers, seaLevel, width, height, seed, quality } = input;
  const setting = MESH_QUALITY_SETTINGS[quality];
  const rng = createSeededRng(`${seed}|sim-mesh`);
  const points: SimulationMeshPoint[] = [];
  const cellSize = quality === "high" ? 3 : quality === "medium" ? 4 : 5;
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

  const borderStep = quality === "high" ? 24 : quality === "medium" ? 30 : 38;
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
    const slopeFactor = sampleHeightVariation(layers.height, u, v);
    const biomeEdge = sampleBiomeEdgeDensity(
      layers.biome,
      layers.cellsX,
      layers.cellsY,
      u,
      v
    );
    const coastFactor = 1 - clamp(Math.abs(altitude - seaLevel) / 0.055, 0, 1);
    const featureDensity = clamp(
      biomeEdge * 0.68 + slopeFactor * 0.57 + coastFactor * 0.24,
      0,
      1
    );
    const homogeneous = clamp(
      1 - Math.max(biomeEdge * 1.2, slopeFactor * 1.1, coastFactor * 0.85),
      0,
      1
    );
    const acceptProb = clamp(
      0.05 + featureDensity * 0.9 - homogeneous * 0.24,
      0.025,
      0.98
    );
    if (rng() > acceptProb) {
      continue;
    }

    const span = setting.maxRadius - setting.minRadius;
    const denseRadius = setting.maxRadius - featureDensity * span;
    const sparseBoost = homogeneous * span * 0.32;
    const r = clamp(denseRadius + sparseBoost, setting.minRadius, setting.maxRadius);
    pushPoint(x, y, r);
  }

  return points;
};

const makeCircumTriangle = (
  points: SimulationPoint[],
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
  points: SimulationMeshPoint[],
  width: number,
  height: number
): SimulationMeshFace[] => {
  const baseCount = points.length;
  if (baseCount < 3) {
    return [];
  }

  const all: SimulationPoint[] = points.map((p) => ({ x: p.x, y: p.y }));
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
    .filter((tri) => tri.a < baseCount && tri.b < baseCount && tri.c < baseCount)
    .map((tri) => ({ a: tri.a, b: tri.b, c: tri.c }));
};

const buildVoronoiTopology = (
  points: SimulationMeshPoint[],
  faces: SimulationMeshFace[],
  width: number,
  height: number
): { cells: SimulationMeshCell[]; boundaries: SimulationMeshBoundary[] } => {
  if (points.length === 0 || faces.length === 0) {
    return { cells: [], boundaries: [] };
  }
  const plainPoints: SimulationPoint[] = points.map((point) => ({
    x: point.x,
    y: point.y,
  }));
  const centers: Array<SimulationPoint | null> = faces.map((face) => {
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

  const cells: SimulationMeshCell[] = [];
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

    const vertices: SimulationPoint[] = [];
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

  const edgeToFaces = new Map<string, { a: number; b: number; faceIds: number[] }>();
  const trackEdge = (a: number, b: number, faceId: number) => {
    const aa = a < b ? a : b;
    const bb = a < b ? b : a;
    const key = `${aa}_${bb}`;
    const item = edgeToFaces.get(key);
    if (item) {
      item.faceIds.push(faceId);
      return;
    }
    edgeToFaces.set(key, { a: aa, b: bb, faceIds: [faceId] });
  };

  faces.forEach((face, faceId) => {
    trackEdge(face.a, face.b, faceId);
    trackEdge(face.b, face.c, faceId);
    trackEdge(face.c, face.a, faceId);
  });

  const boundaries: SimulationMeshBoundary[] = [];
  for (const edge of edgeToFaces.values()) {
    if (edge.faceIds.length < 2) {
      continue;
    }
    const c1 = centers[edge.faceIds[0]];
    const c2 = centers[edge.faceIds[1]];
    if (!c1 || !c2) {
      continue;
    }
    boundaries.push({
      a: edge.a,
      b: edge.b,
      p1: { x: clamp(c1.x, 0, width), y: clamp(c1.y, 0, height) },
      p2: { x: clamp(c2.x, 0, width), y: clamp(c2.y, 0, height) },
    });
  }

  return { cells, boundaries };
};

export const buildSimulationMesh = (
  input: SimulationMeshBuildInput
): SimulationMeshResult => {
  const points = buildAdaptiveMeshPoints(input);
  const faces = triangulateAdaptiveMesh(points, input.width, input.height);
  const topology = buildVoronoiTopology(points, faces, input.width, input.height);
  return {
    points,
    faces,
    cells: topology.cells,
    boundaries: topology.boundaries,
  };
};
