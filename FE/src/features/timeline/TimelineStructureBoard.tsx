import {
  type DragEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BoardViewportControls } from "../../components/common/BoardViewportControls";
import { useToast } from "../../components/common/Toast";
import { useBoardViewport } from "../../hooks/useBoardViewport";
import { useI18n } from "../../i18n/I18nProvider";
import {
  getTimelineAxesPage,
  getTimelineErasPage,
  getTimelineSegmentsPage,
  updateTimelineEra,
  updateTimelineSegment,
} from "./timeline-structure.api";
import type { TimelineAxis, TimelineEra, TimelineSegment } from "./timeline-structure.types";

type TimelineStructureBoardProps = {
  refreshKey?: number;
};

type SegmentLayout = {
  segment: TimelineSegment;
  start: number;
  end: number;
  duration: number;
  x: number;
  width: number;
  y: number;
};

type EraLayout = {
  era: TimelineEra;
  start: number;
  end: number;
  duration: number;
  x: number;
  width: number;
  y: number;
  segments: SegmentLayout[];
};

type AxisLayout = {
  axis: TimelineAxis;
  start: number;
  end: number;
  duration: number;
  y: number;
  eras: EraLayout[];
};

type SelectedBoardNode = {
  kind: "axis" | "era" | "segment";
  id: string;
};

type DragBoardNode = {
  kind: "era" | "segment";
  id: string;
};

type DropHint = {
  kind: "era" | "segment";
  id: string;
  position: "before" | "after";
} | null;

const AXIS_X = 190;
const AXIS_WIDTH = 1320;
const TOP_PADDING = 44;
const ROW_HEIGHT = 220;
const AXIS_BAR_HEIGHT = 20;
const ERA_BAR_HEIGHT = 16;
const SEGMENT_BAR_HEIGHT = 12;
const LAYER_GAP = 18;
const AXIS_BAR_Y = 18;
const ERA_BAR_Y = AXIS_BAR_Y + AXIS_BAR_HEIGHT + LAYER_GAP;
const SEGMENT_BAR_Y = ERA_BAR_Y + ERA_BAR_HEIGHT + LAYER_GAP;
const MIN_BAR_WIDTH = 24;
const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MINIMAP_PADDING = 10;
const MINIMAP_HEADER_HEIGHT = 20;
const PAGE_LIMIT = 200;

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

const getDurationFromRange = (
  start: number | undefined,
  end: number | undefined,
  fallback = 1
) => {
  if (hasValidRange(start, end)) {
    return Math.max((end as number) - (start as number), 1);
  }
  return Math.max(fallback, 1);
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const isDeadlockError = (error: unknown) => {
  const message = (error as Error)?.message ?? "";
  return /deadlock/i.test(message) || /DeadlockDetected/i.test(message);
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

    const eraDefinitions = axisEras.map((era) => {
      const eraSegments = [...(segmentsByEra.get(era.id) ?? [])].sort(sortSegments);
      const segmentDefinitions = eraSegments.map((segment) => ({
        segment,
        duration: getDurationFromRange(segment.startTick, segment.endTick, 1),
      }));

      const durationFromSegments = segmentDefinitions.reduce(
        (sum, item) => sum + item.duration,
        0
      );
      const fallbackDuration = getDurationFromRange(era.startTick, era.endTick, 1);

      return {
        era,
        duration: Math.max(durationFromSegments || fallbackDuration, 1),
        segments: segmentDefinitions,
      };
    });

    const durationFromEras = eraDefinitions.reduce((sum, item) => sum + item.duration, 0);
    const fallbackAxisDuration = getDurationFromRange(axis.startTick, axis.endTick, 100);
    const axisDuration = Math.max(durationFromEras || fallbackAxisDuration, 1);
    const axisStart = 0;
    const axisEnd = axisStart + axisDuration;

    let eraCursor = axisStart;
    const eraLayouts: EraLayout[] = eraDefinitions.map((item) => {
      const eraStart = eraCursor;
      const eraEnd = eraStart + item.duration;
      eraCursor = eraEnd;

      const eraX = mapTickToX(eraStart, axisStart, axisEnd);
      const eraEndX = mapTickToX(eraEnd, axisStart, axisEnd);
      const eraWidth = Math.max(MIN_BAR_WIDTH, eraEndX - eraX);

      let segmentCursor = eraStart;
      const segmentLayouts: SegmentLayout[] = item.segments.map((segmentItem) => {
        const segmentStart = segmentCursor;
        const segmentEnd = segmentStart + segmentItem.duration;
        segmentCursor = segmentEnd;

        const segmentX = mapTickToX(segmentStart, axisStart, axisEnd);
        const segmentEndX = mapTickToX(segmentEnd, axisStart, axisEnd);

        return {
          segment: segmentItem.segment,
          start: segmentStart,
          end: segmentEnd,
          duration: segmentItem.duration,
          x: segmentX,
          width: Math.max(MIN_BAR_WIDTH, segmentEndX - segmentX),
          y: TOP_PADDING + axisIndex * ROW_HEIGHT + SEGMENT_BAR_Y,
        };
      });

      return {
        era: item.era,
        start: eraStart,
        end: eraEnd,
        duration: item.duration,
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
      duration: axisDuration,
      y: TOP_PADDING + axisIndex * ROW_HEIGHT + AXIS_BAR_Y,
      eras: eraLayouts,
    };
  });
};

export const TimelineStructureBoard = ({ refreshKey = 0 }: TimelineStructureBoardProps) => {
  const { t } = useI18n();
  const { notify } = useToast();
  const boardRef = useRef<HTMLDivElement>(null);
  const [axes, setAxes] = useState<TimelineAxis[]>([]);
  const [eras, setEras] = useState<TimelineEra[]>([]);
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SelectedBoardNode | null>(null);
  const [dragNode, setDragNode] = useState<DragBoardNode | null>(null);
  const [dropHint, setDropHint] = useState<DropHint>(null);
  const [savingOrder, setSavingOrder] = useState(false);
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
    const loadAll = async <T,>(
      loader: (query: { limit: number; offset: number }) => Promise<{
        data: T[];
        meta?: { total?: number };
      }>
    ): Promise<T[]> => {
      const items: T[] = [];
      let offset = 0;
      let done = false;

      while (!done) {
        const response = await loader({ limit: PAGE_LIMIT, offset });
        const batch = response?.data ?? [];
        items.push(...batch);

        const total =
          typeof response?.meta?.total === "number" ? response.meta.total : undefined;
        if (total !== undefined) {
          done = items.length >= total || batch.length === 0;
        } else {
          done = batch.length < PAGE_LIMIT;
        }

        offset += batch.length;
        if (batch.length === 0) {
          done = true;
        }
      }

      return items;
    };

    setLoading(true);
    try {
      const [axisRes, eraRes, segmentRes] = await Promise.all([
        loadAll((query) => getTimelineAxesPage(query)),
        loadAll((query) => getTimelineErasPage(query)),
        loadAll((query) => getTimelineSegmentsPage(query)),
      ]);
      setAxes(axisRes);
      setEras(eraRes);
      setSegments(segmentRes);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const axisLayout = useMemo(() => buildLayout(axes, eras, segments), [axes, eras, segments]);

  const buildEraPayload = (era: TimelineEra, axisId: string, order: number) => ({
    axisId,
    name: era.name,
    code: era.code,
    summary: era.summary,
    description: era.description,
    order,
    startTick: era.startTick,
    endTick: era.endTick,
    status: era.status,
    notes: era.notes,
    tags: era.tags,
  });

  const buildSegmentPayload = (
    segment: TimelineSegment,
    eraId: string,
    order: number
  ) => ({
    eraId,
    name: segment.name,
    code: segment.code,
    summary: segment.summary,
    description: segment.description,
    order,
    startTick: segment.startTick,
    endTick: segment.endTick,
    status: segment.status,
    notes: segment.notes,
    tags: segment.tags,
  });

  const canDropEraOnEra = useCallback(
    (draggingEraId: string, targetEraId: string) => {
      if (draggingEraId === targetEraId) {
        return false;
      }
      const draggingEra = eras.find((item) => item.id === draggingEraId);
      const targetEra = eras.find((item) => item.id === targetEraId);
      if (!draggingEra || !targetEra) {
        return false;
      }
      return draggingEra.axisId === targetEra.axisId;
    },
    [eras]
  );

  const canDropSegmentOnSegment = useCallback(
    (draggingSegmentId: string, targetSegmentId: string) => {
      if (draggingSegmentId === targetSegmentId) {
        return false;
      }
      const draggingSegment = segments.find((item) => item.id === draggingSegmentId);
      const targetSegment = segments.find((item) => item.id === targetSegmentId);
      if (!draggingSegment || !targetSegment) {
        return false;
      }
      return draggingSegment.eraId === targetSegment.eraId;
    },
    [segments]
  );

  const reorderEras = useCallback(
    async (
      draggingEraId: string,
      targetEraId: string,
      position: "before" | "after"
    ) => {
      const draggingEra = eras.find((item) => item.id === draggingEraId);
      const targetEra = eras.find((item) => item.id === targetEraId);
      if (!draggingEra || !targetEra || draggingEra.id === targetEra.id) {
        return;
      }
      if (draggingEra.axisId !== targetEra.axisId) {
        return;
      }

      const targetAxisId = targetEra.axisId;
      const siblings = eras
        .filter((item) => item.axisId === targetAxisId && item.id !== draggingEra.id)
        .sort(sortEras);
      const targetIndex = siblings.findIndex((item) => item.id === targetEra.id);
      if (targetIndex < 0) {
        return;
      }

      const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
      const nextOrder = [...siblings];
      nextOrder.splice(insertIndex, 0, draggingEra);

      const updates = nextOrder
        .map((item, index) => ({
          item,
          nextOrder: (index + 1) * 10,
          nextAxisId: targetAxisId,
        }))
        .filter(({ item, nextOrder: expectedOrder, nextAxisId }) => {
          const currentOrder = isFiniteNumber(item.order) ? item.order : undefined;
          return item.axisId !== nextAxisId || currentOrder !== expectedOrder;
        });

      if (!updates.length) {
        return;
      }

      setSavingOrder(true);
      try {
        for (const { item, nextOrder: expectedOrder, nextAxisId } of updates) {
          let attempt = 0;
          while (attempt < 3) {
            try {
              await updateTimelineEra(
                item.id,
                buildEraPayload(item, nextAxisId, expectedOrder)
              );
              break;
            } catch (error) {
              attempt += 1;
              if (!isDeadlockError(error) || attempt >= 3) {
                throw error;
              }
              await wait(120 * attempt);
            }
          }
        }
        notify(t("Timeline order updated."), "success");
        await loadData();
        setSelectedNode({ kind: "era", id: draggingEraId });
      } catch (error) {
        notify((error as Error).message, "error");
      } finally {
        setSavingOrder(false);
      }
    },
    [eras, loadData, notify, t]
  );

  const reorderSegments = useCallback(
    async (
      draggingSegmentId: string,
      targetSegmentId: string,
      position: "before" | "after"
    ) => {
      const draggingSegment = segments.find((item) => item.id === draggingSegmentId);
      const targetSegment = segments.find((item) => item.id === targetSegmentId);
      if (
        !draggingSegment ||
        !targetSegment ||
        draggingSegment.id === targetSegment.id
      ) {
        return;
      }
      if (draggingSegment.eraId !== targetSegment.eraId) {
        return;
      }

      const targetEraId = targetSegment.eraId;
      const siblings = segments
        .filter((item) => item.eraId === targetEraId && item.id !== draggingSegment.id)
        .sort(sortSegments);
      const targetIndex = siblings.findIndex((item) => item.id === targetSegment.id);
      if (targetIndex < 0) {
        return;
      }

      const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
      const nextOrder = [...siblings];
      nextOrder.splice(insertIndex, 0, draggingSegment);

      const updates = nextOrder
        .map((item, index) => ({
          item,
          nextOrder: (index + 1) * 10,
          nextEraId: targetEraId,
        }))
        .filter(({ item, nextOrder: expectedOrder, nextEraId }) => {
          const currentOrder = isFiniteNumber(item.order) ? item.order : undefined;
          return item.eraId !== nextEraId || currentOrder !== expectedOrder;
        });

      if (!updates.length) {
        return;
      }

      setSavingOrder(true);
      try {
        for (const { item, nextOrder: expectedOrder, nextEraId } of updates) {
          let attempt = 0;
          while (attempt < 3) {
            try {
              await updateTimelineSegment(
                item.id,
                buildSegmentPayload(item, nextEraId, expectedOrder)
              );
              break;
            } catch (error) {
              attempt += 1;
              if (!isDeadlockError(error) || attempt >= 3) {
                throw error;
              }
              await wait(120 * attempt);
            }
          }
        }
        notify(t("Timeline order updated."), "success");
        await loadData();
        setSelectedNode({ kind: "segment", id: draggingSegmentId });
      } catch (error) {
        notify((error as Error).message, "error");
      } finally {
        setSavingOrder(false);
      }
    },
    [segments, loadData, notify, t]
  );

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

  const resolveDropPosition = (event: DragEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX < rect.left + rect.width / 2 ? "before" : "after";
  };

  const clearDragState = () => {
    setDragNode(null);
    setDropHint(null);
  };

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
                  0 → {Math.round(axisNode.duration)}
                </span>
              </div>

              <div
                className={[
                  "timeline-structure-node",
                  "timeline-structure-node--axis",
                  selectedNode?.kind === "axis" && selectedNode.id === axisNode.axis.id
                    ? "timeline-structure-node--selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  width: AXIS_WIDTH,
                  transform: `translate(${AXIS_X}px, ${axisNode.y}px)`,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNode({ kind: "axis", id: axisNode.axis.id });
                }}
              >
                <span className="timeline-structure-node__title">{axisNode.axis.name}</span>
                <span className="timeline-structure-node__range">
                  0 - {Math.round(axisNode.duration)}
                </span>
              </div>

              {axisNode.eras.map((eraNode) => (
                <div key={eraNode.era.id}>
                  <div
                    className={[
                      "timeline-structure-node",
                      "timeline-structure-node--era",
                      selectedNode?.kind === "era" && selectedNode.id === eraNode.era.id
                        ? "timeline-structure-node--selected"
                        : "",
                      dropHint?.kind === "era" && dropHint.id === eraNode.era.id
                        ? dropHint.position === "before"
                          ? "timeline-structure-node--drop-before"
                          : "timeline-structure-node--drop-after"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      width: eraNode.width,
                      transform: `translate(${eraNode.x}px, ${eraNode.y}px)`,
                    }}
                    draggable={!savingOrder}
                    onDragStart={(event) => {
                      event.stopPropagation();
                      event.dataTransfer.setData("text/plain", eraNode.era.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDragNode({ kind: "era", id: eraNode.era.id });
                      setDropHint(null);
                    }}
                    onDragOver={(event) => {
                      if (
                        savingOrder ||
                        !dragNode ||
                        dragNode.kind !== "era" ||
                        !canDropEraOnEra(dragNode.id, eraNode.era.id)
                      ) {
                        return;
                      }
                      event.preventDefault();
                      event.stopPropagation();
                      setDropHint({
                        kind: "era",
                        id: eraNode.era.id,
                        position: resolveDropPosition(event),
                      });
                    }}
                    onDragLeave={() => {
                      if (dropHint?.kind === "era" && dropHint.id === eraNode.era.id) {
                        setDropHint(null);
                      }
                    }}
                    onDrop={(event) => {
                      if (
                        !dragNode ||
                        dragNode.kind !== "era" ||
                        savingOrder ||
                        !canDropEraOnEra(dragNode.id, eraNode.era.id)
                      ) {
                        clearDragState();
                        return;
                      }
                      event.preventDefault();
                      event.stopPropagation();
                      const position = resolveDropPosition(event);
                      void reorderEras(dragNode.id, eraNode.era.id, position);
                      clearDragState();
                    }}
                    onDragEnd={clearDragState}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedNode({ kind: "era", id: eraNode.era.id });
                    }}
                  >
                    <span className="timeline-structure-node__title">{eraNode.era.name}</span>
                    <span className="timeline-structure-node__range">
                      0 - {Math.round(eraNode.duration)}
                    </span>
                  </div>

                  {eraNode.segments.map((segmentNode) => (
                    <div
                      key={segmentNode.segment.id}
                      className={[
                        "timeline-structure-node",
                        "timeline-structure-node--segment",
                        selectedNode?.kind === "segment" &&
                        selectedNode.id === segmentNode.segment.id
                          ? "timeline-structure-node--selected"
                          : "",
                        dropHint?.kind === "segment" &&
                        dropHint.id === segmentNode.segment.id
                          ? dropHint.position === "before"
                            ? "timeline-structure-node--drop-before"
                            : "timeline-structure-node--drop-after"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        width: segmentNode.width,
                        transform: `translate(${segmentNode.x}px, ${segmentNode.y}px)`,
                      }}
                      draggable={!savingOrder}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        event.dataTransfer.setData("text/plain", segmentNode.segment.id);
                        event.dataTransfer.effectAllowed = "move";
                        setDragNode({ kind: "segment", id: segmentNode.segment.id });
                        setDropHint(null);
                      }}
                    onDragOver={(event) => {
                      if (
                        savingOrder ||
                        !dragNode ||
                        dragNode.kind !== "segment" ||
                        !canDropSegmentOnSegment(dragNode.id, segmentNode.segment.id)
                      ) {
                        return;
                      }
                        event.preventDefault();
                        event.stopPropagation();
                        setDropHint({
                          kind: "segment",
                          id: segmentNode.segment.id,
                          position: resolveDropPosition(event),
                        });
                      }}
                      onDragLeave={() => {
                        if (
                          dropHint?.kind === "segment" &&
                          dropHint.id === segmentNode.segment.id
                        ) {
                          setDropHint(null);
                        }
                      }}
                      onDrop={(event) => {
                        if (
                          !dragNode ||
                          dragNode.kind !== "segment" ||
                          savingOrder ||
                          !canDropSegmentOnSegment(dragNode.id, segmentNode.segment.id)
                        ) {
                          clearDragState();
                          return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        const position = resolveDropPosition(event);
                        void reorderSegments(dragNode.id, segmentNode.segment.id, position);
                        clearDragState();
                      }}
                      onDragEnd={clearDragState}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedNode({ kind: "segment", id: segmentNode.segment.id });
                      }}
                    >
                      <span className="timeline-structure-node__title">
                        {segmentNode.segment.name}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
