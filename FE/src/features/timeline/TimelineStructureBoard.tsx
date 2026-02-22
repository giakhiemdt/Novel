import { type PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoardViewportControls } from "../../components/common/BoardViewportControls";
import { useBoardViewport } from "../../hooks/useBoardViewport";
import { useI18n } from "../../i18n/I18nProvider";
import {
  getTimelineAxesPage,
  getTimelineErasPage,
  getTimelineSegmentsPage,
} from "./timeline-structure.api";
import type { TimelineAxis, TimelineEra, TimelineSegment } from "./timeline-structure.types";

type TimelineStructureBoardProps = {
  refreshKey?: number;
};

type SegmentLayout = {
  segment: TimelineSegment;
  start: number;
  end: number;
  x: number;
  width: number;
  y: number;
};

type EraLayout = {
  era: TimelineEra;
  start: number;
  end: number;
  x: number;
  width: number;
  y: number;
  segments: SegmentLayout[];
};

type AxisLayout = {
  axis: TimelineAxis;
  start: number;
  end: number;
  y: number;
  eras: EraLayout[];
};

type SelectedNode = {
  kind: "axis" | "era" | "segment";
  name: string;
  code?: string;
  start: number;
  end: number;
  axisName?: string;
  eraName?: string;
};

const AXIS_X = 190;
const AXIS_WIDTH = 1320;
const TOP_PADDING = 44;
const ROW_HEIGHT = 220;
const AXIS_BAR_Y = 18;
const ERA_BAR_Y = 70;
const SEGMENT_BAR_Y = 92;
const AXIS_BAR_HEIGHT = 20;
const ERA_BAR_HEIGHT = 16;
const SEGMENT_BAR_HEIGHT = 12;
const MIN_BAR_WIDTH = 24;
const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MINIMAP_PADDING = 10;
const MINIMAP_HEADER_HEIGHT = 20;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const sortAxes = (a: TimelineAxis, b: TimelineAxis) => {
  const orderA = isFiniteNumber(a.sortOrder) ? a.sortOrder : Number.MAX_SAFE_INTEGER;
  const orderB = isFiniteNumber(b.sortOrder) ? b.sortOrder : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return (a.name ?? "").localeCompare(b.name ?? "", undefined, {
    sensitivity: "base",
    numeric: true,
  });
};

const sortEras = (a: TimelineEra, b: TimelineEra) => {
  const orderA = isFiniteNumber(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
  const orderB = isFiniteNumber(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  const startA = isFiniteNumber(a.startTick) ? a.startTick : Number.MAX_SAFE_INTEGER;
  const startB = isFiniteNumber(b.startTick) ? b.startTick : Number.MAX_SAFE_INTEGER;
  if (startA !== startB) {
    return startA - startB;
  }
  return (a.name ?? "").localeCompare(b.name ?? "", undefined, {
    sensitivity: "base",
    numeric: true,
  });
};

const sortSegments = (a: TimelineSegment, b: TimelineSegment) => {
  const orderA = isFiniteNumber(a.order) ? a.order : Number.MAX_SAFE_INTEGER;
  const orderB = isFiniteNumber(b.order) ? b.order : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  const startA = isFiniteNumber(a.startTick) ? a.startTick : Number.MAX_SAFE_INTEGER;
  const startB = isFiniteNumber(b.startTick) ? b.startTick : Number.MAX_SAFE_INTEGER;
  if (startA !== startB) {
    return startA - startB;
  }
  return (a.name ?? "").localeCompare(b.name ?? "", undefined, {
    sensitivity: "base",
    numeric: true,
  });
};

const hasValidRange = (start: unknown, end: unknown) =>
  isFiniteNumber(start) && isFiniteNumber(end) && end > start;

const mapTickToX = (tick: number, start: number, end: number) => {
  const ratio = clamp((tick - start) / Math.max(end - start, 1), 0, 1);
  return AXIS_X + ratio * AXIS_WIDTH;
};

const buildLayout = (
  axes: TimelineAxis[],
  eras: TimelineEra[],
  segments: TimelineSegment[]
): AxisLayout[] => {
  const erasByAxis = new Map<string, TimelineEra[]>();
  eras.forEach((era) => {
    const list = erasByAxis.get(era.axisId) ?? [];
    list.push(era);
    erasByAxis.set(era.axisId, list);
  });

  const segmentsByEra = new Map<string, TimelineSegment[]>();
  segments.forEach((segment) => {
    const list = segmentsByEra.get(segment.eraId) ?? [];
    list.push(segment);
    segmentsByEra.set(segment.eraId, list);
  });

  return [...axes].sort(sortAxes).map((axis, axisIndex) => {
    const axisEras = [...(erasByAxis.get(axis.id) ?? [])].sort(sortEras);
    const childStarts: number[] = [];
    const childEnds: number[] = [];

    axisEras.forEach((era) => {
      if (isFiniteNumber(era.startTick)) {
        childStarts.push(era.startTick);
      }
      if (isFiniteNumber(era.endTick)) {
        childEnds.push(era.endTick);
      }
      const eraSegments = segmentsByEra.get(era.id) ?? [];
      eraSegments.forEach((segment) => {
        if (isFiniteNumber(segment.startTick)) {
          childStarts.push(segment.startTick);
        }
        if (isFiniteNumber(segment.endTick)) {
          childEnds.push(segment.endTick);
        }
      });
    });

    const axisStart = isFiniteNumber(axis.startTick)
      ? axis.startTick
      : childStarts.length > 0
      ? Math.min(...childStarts)
      : 0;
    const derivedEnd = childEnds.length > 0 ? Math.max(...childEnds) : axisStart + 100;
    const axisEndBase = isFiniteNumber(axis.endTick) ? axis.endTick : derivedEnd;
    const axisEnd = axisEndBase > axisStart ? axisEndBase : axisStart + 100;

    const eraSlot = Math.max((axisEnd - axisStart) / Math.max(axisEras.length, 1), 1);

    const eraLayouts: EraLayout[] = axisEras.map((era, eraIndex) => {
      let eraStart = axisStart + eraIndex * eraSlot;
      let eraEnd = eraStart + eraSlot * 0.95;
      if (hasValidRange(era.startTick, era.endTick)) {
        eraStart = clamp(era.startTick as number, axisStart, axisEnd - 1);
        eraEnd = clamp(era.endTick as number, eraStart + 1, axisEnd);
      }

      const eraX = mapTickToX(eraStart, axisStart, axisEnd);
      const eraEndX = mapTickToX(eraEnd, axisStart, axisEnd);
      const eraWidth = Math.max(MIN_BAR_WIDTH, eraEndX - eraX);

      const eraSegments = [...(segmentsByEra.get(era.id) ?? [])].sort(sortSegments);
      const segmentSlot = Math.max((eraEnd - eraStart) / Math.max(eraSegments.length, 1), 0.5);

      const segmentLayouts: SegmentLayout[] = eraSegments.map((segment, segmentIndex) => {
        let segmentStart = eraStart + segmentIndex * segmentSlot;
        let segmentEnd = segmentStart + segmentSlot * 0.88;

        if (hasValidRange(segment.startTick, segment.endTick)) {
          segmentStart = clamp(segment.startTick as number, eraStart, eraEnd - 0.2);
          segmentEnd = clamp(segment.endTick as number, segmentStart + 0.2, eraEnd);
        }

        const segmentX = mapTickToX(segmentStart, axisStart, axisEnd);
        const segmentEndX = mapTickToX(segmentEnd, axisStart, axisEnd);

        return {
          segment,
          start: segmentStart,
          end: segmentEnd,
          x: segmentX,
          width: Math.max(MIN_BAR_WIDTH, segmentEndX - segmentX),
          y: TOP_PADDING + axisIndex * ROW_HEIGHT + SEGMENT_BAR_Y,
        };
      });

      return {
        era,
        start: eraStart,
        end: eraEnd,
        x: eraX,
        width: eraWidth,
        y: TOP_PADDING + axisIndex * ROW_HEIGHT + ERA_BAR_Y,
        segments: segmentLayouts,
      };
    });

    return {
      axis,
      start: axisStart,
      end: axisEnd,
      y: TOP_PADDING + axisIndex * ROW_HEIGHT + AXIS_BAR_Y,
      eras: eraLayouts,
    };
  });
};

export const TimelineStructureBoard = ({ refreshKey = 0 }: TimelineStructureBoardProps) => {
  const { t } = useI18n();
  const boardRef = useRef<HTMLDivElement>(null);
  const [axes, setAxes] = useState<TimelineAxis[]>([]);
  const [eras, setEras] = useState<TimelineEra[]>([]);
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const {
    scale,
    pan,
    isPanning,
    viewportSize,
    zoomBy,
    startPan,
    movePan,
    stopPan,
    fitToRect,
    resetView,
    centerOnWorldPoint,
  } = useBoardViewport({
    boardRef,
    minScale: 0.38,
    maxScale: 2.4,
    defaultPan: { x: 0, y: 0 },
    wheelZoomFactor: 0.001,
    consumeWheel: true,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [axisRes, eraRes, segmentRes] = await Promise.all([
        getTimelineAxesPage({ limit: 500, offset: 0 }),
        getTimelineErasPage({ limit: 1000, offset: 0 }),
        getTimelineSegmentsPage({ limit: 2000, offset: 0 }),
      ]);
      setAxes(axisRes?.data ?? []);
      setEras(eraRes?.data ?? []);
      setSegments(segmentRes?.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const axisLayout = useMemo(() => buildLayout(axes, eras, segments), [axes, eras, segments]);

  const contentBounds = useMemo(() => {
    if (!axisLayout.length) {
      return { x: 0, y: 0, width: 1200, height: 420 };
    }

    const minX = AXIS_X - 140;
    const minY = TOP_PADDING - 26;
    const maxY =
      axisLayout[axisLayout.length - 1]!.y + ROW_HEIGHT - AXIS_BAR_Y + 18;
    const maxX = AXIS_X + AXIS_WIDTH + 80;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [axisLayout]);

  const minimapScale = useMemo(() => {
    const innerWidth = MINIMAP_WIDTH - MINIMAP_PADDING * 2;
    const innerHeight = MINIMAP_HEIGHT - MINIMAP_HEADER_HEIGHT - MINIMAP_PADDING;
    return Math.min(
      innerWidth / Math.max(contentBounds.width, 1),
      innerHeight / Math.max(contentBounds.height, 1)
    );
  }, [contentBounds.height, contentBounds.width]);

  const viewportWorld = useMemo(() => {
    if (!viewportSize.width || !viewportSize.height) {
      return null;
    }
    return {
      x: -pan.x / scale,
      y: -pan.y / scale,
      width: viewportSize.width / scale,
      height: viewportSize.height / scale,
    };
  }, [pan.x, pan.y, scale, viewportSize.height, viewportSize.width]);

  const handleBoardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest(".timeline-structure-node")) {
      return;
    }
    if (target.closest(".graph-board-toolbar") || target.closest(".graph-board-minimap")) {
      return;
    }
    startPan(event.clientX, event.clientY);
    setSelectedNode(null);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPanning) {
      return;
    }
    movePan(event.clientX, event.clientY);
  };

  const handlePointerUp = () => {
    if (!isPanning) {
      return;
    }
    stopPan();
  };

  return (
    <div className="timeline-structure-board-wrap">
      <div className="card timeline-structure-board-head">
        <div>
          <h3 className="section-title">{t("Timeline board")}</h3>
          <p className="header__subtitle">
            {t(
              "Each axis is a main horizontal bar. Eras are smaller bars under the axis, and segments are nested bars inside each era."
            )}
          </p>
        </div>
        <button
          type="button"
          className="table__action"
          onClick={() => void loadData()}
          disabled={loading}
        >
          {loading ? t("Loading...") : t("Reload timeline-first data")}
        </button>
      </div>

      <div
        className="timeline-board timeline-structure-board"
        ref={boardRef}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <BoardViewportControls
          zoom={scale}
          onZoomOut={() => zoomBy(-0.12)}
          onZoomIn={() => zoomBy(0.12)}
          onFit={() => fitToRect(contentBounds, 24)}
          onReset={resetView}
          minimapTitle={t("Mini map")}
          minimap={(
            <svg
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              role="img"
              aria-label={t("Mini map")}
              onPointerDown={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const localX = event.clientX - rect.left;
                const localY = event.clientY - rect.top - MINIMAP_HEADER_HEIGHT;
                const worldX = contentBounds.x + (localX - MINIMAP_PADDING) / minimapScale;
                const worldY = contentBounds.y + (localY - MINIMAP_PADDING) / minimapScale;
                centerOnWorldPoint(worldX, worldY);
              }}
            >
              <rect
                x={MINIMAP_PADDING}
                y={MINIMAP_HEADER_HEIGHT}
                width={MINIMAP_WIDTH - MINIMAP_PADDING * 2}
                height={MINIMAP_HEIGHT - MINIMAP_HEADER_HEIGHT - MINIMAP_PADDING}
                className="graph-board-minimap__frame"
              />

              {axisLayout.map((axisNode) => (
                <g key={`mini-${axisNode.axis.id}`}>
                  <rect
                    x={MINIMAP_PADDING + (AXIS_X - contentBounds.x) * minimapScale}
                    y={
                      MINIMAP_HEADER_HEIGHT +
                      MINIMAP_PADDING +
                      (axisNode.y - contentBounds.y) * minimapScale
                    }
                    width={AXIS_WIDTH * minimapScale}
                    height={Math.max(2, AXIS_BAR_HEIGHT * minimapScale)}
                    className="graph-board-minimap__node"
                  />
                  {axisNode.eras.map((eraNode) => (
                    <rect
                      key={`mini-era-${eraNode.era.id}`}
                      x={MINIMAP_PADDING + (eraNode.x - contentBounds.x) * minimapScale}
                      y={
                        MINIMAP_HEADER_HEIGHT +
                        MINIMAP_PADDING +
                        (eraNode.y - contentBounds.y) * minimapScale
                      }
                      width={Math.max(2, eraNode.width * minimapScale)}
                      height={Math.max(2, ERA_BAR_HEIGHT * minimapScale)}
                      className="graph-board-minimap__edge"
                    />
                  ))}
                </g>
              ))}

              {viewportWorld ? (
                <rect
                  x={MINIMAP_PADDING + (viewportWorld.x - contentBounds.x) * minimapScale}
                  y={
                    MINIMAP_HEADER_HEIGHT +
                    MINIMAP_PADDING +
                    (viewportWorld.y - contentBounds.y) * minimapScale
                  }
                  width={viewportWorld.width * minimapScale}
                  height={viewportWorld.height * minimapScale}
                  className="graph-board-minimap__viewport"
                />
              ) : null}
            </svg>
          )}
        />

        <div
          className="timeline-board__canvas"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          }}
        >
          {axisLayout.length === 0 ? (
            <p className="timeline-empty" style={{ transform: "translate(32px, 26px)" }}>
              {t("No timeline-first structures yet.")}
            </p>
          ) : null}

          {axisLayout.map((axisNode) => (
            <div key={axisNode.axis.id}>
              <div
                className="timeline-structure-axis-label"
                style={{ transform: `translate(24px, ${axisNode.y - 2}px)` }}
              >
                <strong>{axisNode.axis.name}</strong>
                <span>
                  {Math.round(axisNode.start)} → {Math.round(axisNode.end)}
                </span>
              </div>

              <button
                type="button"
                className="timeline-structure-node timeline-structure-node--axis"
                style={{
                  width: AXIS_WIDTH,
                  transform: `translate(${AXIS_X}px, ${axisNode.y}px)`,
                }}
                onClick={() =>
                  setSelectedNode({
                    kind: "axis",
                    name: axisNode.axis.name,
                    code: axisNode.axis.code,
                    start: axisNode.start,
                    end: axisNode.end,
                  })
                }
              >
                <span className="timeline-structure-node__title">{axisNode.axis.name}</span>
                <span className="timeline-structure-node__range">
                  {Math.round(axisNode.start)} - {Math.round(axisNode.end)}
                </span>
              </button>

              {axisNode.eras.map((eraNode) => (
                <div key={eraNode.era.id}>
                  <button
                    type="button"
                    className="timeline-structure-node timeline-structure-node--era"
                    style={{
                      width: eraNode.width,
                      transform: `translate(${eraNode.x}px, ${eraNode.y}px)`,
                    }}
                    onClick={() =>
                      setSelectedNode({
                        kind: "era",
                        name: eraNode.era.name,
                        code: eraNode.era.code,
                        start: eraNode.start,
                        end: eraNode.end,
                        axisName: axisNode.axis.name,
                      })
                    }
                  >
                    <span className="timeline-structure-node__title">{eraNode.era.name}</span>
                  </button>

                  {eraNode.segments.map((segmentNode) => (
                    <button
                      key={segmentNode.segment.id}
                      type="button"
                      className="timeline-structure-node timeline-structure-node--segment"
                      style={{
                        width: segmentNode.width,
                        transform: `translate(${segmentNode.x}px, ${segmentNode.y}px)`,
                      }}
                      onClick={() =>
                        setSelectedNode({
                          kind: "segment",
                          name: segmentNode.segment.name,
                          code: segmentNode.segment.code,
                          start: segmentNode.start,
                          end: segmentNode.end,
                          axisName: axisNode.axis.name,
                          eraName: eraNode.era.name,
                        })
                      }
                    >
                      <span className="timeline-structure-node__title">
                        {segmentNode.segment.name}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {selectedNode ? (
            <div className="timeline-card" style={{ transform: "translate(24px, 24px)" }}>
              <strong>
                {selectedNode.kind.toUpperCase()}: {selectedNode.name}
              </strong>
              <p>
                {Math.round(selectedNode.start)} → {Math.round(selectedNode.end)}
              </p>
              <div className="timeline-card__meta">
                {selectedNode.axisName ? <span>{selectedNode.axisName}</span> : null}
                {selectedNode.eraName ? <span>{selectedNode.eraName}</span> : null}
                {selectedNode.code ? <span>{selectedNode.code}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
