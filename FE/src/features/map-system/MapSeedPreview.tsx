import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import {
  type BiomeKind,
  type ClimatePreset,
  type GeneratedMapLayers,
  type MapGeneratorWorkerRequest,
  type MapGeneratorWorkerResponse,
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
        setLayers(payload.layers);
        setIsGenerating(false);
      };

      worker.onerror = () => {
        const fallbackOptions = latestOptionsRef.current;
        if (!fallbackOptions) {
          setIsGenerating(false);
          return;
        }
        setLayers(generateMapLayers(fallbackOptions));
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
    setIsGenerating(true);

    const worker = workerRef.current;
    if (!worker) {
      setLayers(generateMapLayers(options));
      setIsGenerating(false);
      return;
    }

    const payload: MapGeneratorWorkerRequest = {
      requestId,
      options,
    };
    worker.postMessage(payload);
  }, [options]);

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

    const cellW = previewWidth / layers.cellsX;
    const cellH = previewHeight / layers.cellsY;

    ctx.clearRect(0, 0, previewWidth, previewHeight);

    for (let y = 0; y < layers.cellsY; y += 1) {
      for (let x = 0; x < layers.cellsX; x += 1) {
        const altitude = layers.height[y][x];
        const isLand = layers.isLand[y][x];
        const biome = layers.biome[y][x];

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

        ctx.fillStyle = color;
        ctx.fillRect(x * cellW, y * cellH, Math.ceil(cellW), Math.ceil(cellH));
      }
    }

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
  }, [layers, options.seaLevel, showBiomes, showHeight, showRivers]);

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
