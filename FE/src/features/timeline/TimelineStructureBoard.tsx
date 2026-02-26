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
import fullscreenIcon from "../../assets/icons/fullscreen.svg";
import fullscreenExitIcon from "../../assets/icons/fullscreen_exit.svg";
import {
  getTimelineAxesPage,
  getTimelineErasPage,
  getTimelineMarkersPage,
  getTimelineSegmentsPage,
  updateTimelineEra,
  updateTimelineSegment,
} from "./timeline-structure.api";
import type {
  TimelineAxis,
  TimelineEra,
  TimelineMarker,
  TimelineSegment,
} from "./timeline-structure.types";

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
  depth: number;
  axisX: number;
  axisWidth: number;
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

type AxisConnector = {
  id: string;
  axisId: string;
  axisType: "branch" | "loop";
  parentName: string;
  path: string;
  badgeX: number;
  badgeY: number;
};

type SelectionSummary = {
  title: string;
  subtitle: string;
  rows: Array<{
    label: string;
    value: string;
  }>;
};

const AXIS_TYPES = ["main", "parallel", "branch", "loop"] as const;
type AxisType = (typeof AXIS_TYPES)[number];
const AXIS_TYPE_LABELS: Record<AxisType, string> = {
  main: "Main",
  parallel: "Parallel",
  branch: "Branch",
  loop: "Loop",
};
const AXIS_TYPE_POLICIES: Record<AxisType, string> = {
  main: "Primary canonical axis.",
  parallel: "Runs independently in parallel with other axes.",
  branch: "Diverges from the parent axis into an alternative branch.",
  loop: "Returns toward the parent axis as a time loop.",
};

const AXIS_X = 190;
const AXIS_WIDTH = 1320;
const AXIS_INDENT_STEP = 52;
const AXIS_MIN_WIDTH = 940;
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
const SHOW_MINIMAP = false;
const YEAR_PX_MIN = 0.25;
const YEAR_PX_MAX = 8;
const YEAR_PX_STEP = 0.25;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const roundToStep = (value: number, step = YEAR_PX_STEP) =>
  Math.round(value / step) * step;

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

const sortMarkers = (a: TimelineMarker, b: TimelineMarker) =>
  a.tick - b.tick || (a.label ?? "").localeCompare(b.label ?? "", undefined, {
    sensitivity: "base",
    numeric: true,
  });

const hasValidRange = (start: unknown, end: unknown) =>
  isFiniteNumber(start) && isFiniteNumber(end) && end > start;

const mapTickToX = (
  tick: number,
  start: number,
  end: number,
  axisX = AXIS_X,
  axisWidth = AXIS_WIDTH
) => {
  const ratio = clamp((tick - start) / Math.max(end - start, 1), 0, 1);
  return axisX + ratio * axisWidth;
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

const getSegmentDuration = (segment: TimelineSegment): number => {
  if (isFiniteNumber(segment.durationYears) && segment.durationYears > 0) {
    return segment.durationYears;
  }
  return getDurationFromRange(segment.startTick, segment.endTick, 1);
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const formatTickRange = (start?: number, end?: number): string => {
  if (!isFiniteNumber(start) && !isFiniteNumber(end)) {
    return "-";
  }
  const startLabel = isFiniteNumber(start) ? Math.round(start).toString() : "?";
  const endLabel = isFiniteNumber(end) ? Math.round(end).toString() : "?";
  return `${startLabel} - ${endLabel}`;
};

const isDeadlockError = (error: unknown) => {
  const message = (error as Error)?.message ?? "";
  return /deadlock/i.test(message) || /DeadlockDetected/i.test(message);
};

const setAlignedDragImage = (event: DragEvent<HTMLElement>) => {
  if (!event.dataTransfer) {
    return;
  }
  const rect = event.currentTarget.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  event.dataTransfer.setDragImage(event.currentTarget, offsetX, offsetY);
};

type AxisRow = {
  axis: TimelineAxis;
  depth: number;
};

const normalizeAxesForHierarchy = (axes: TimelineAxis[]): TimelineAxis[] => {
  if (!axes.length) {
    return [];
  }

  const axisById = new Map<string, TimelineAxis>();
  axes.forEach((axis) => {
    axisById.set(axis.id, axis);
  });

  const mainAxis = axes.find((axis) => axis.axisType === "main");
  const fallbackParentId = mainAxis?.id;

  return axes.map((axis) => {
    if (axis.axisType !== "branch" && axis.axisType !== "loop") {
      return axis;
    }

    const currentParentId = axis.parentAxisId;
    const hasValidParent =
      !!currentParentId && currentParentId !== axis.id && axisById.has(currentParentId);
    if (hasValidParent) {
      return axis;
    }

    if (fallbackParentId && fallbackParentId !== axis.id) {
      return { ...axis, parentAxisId: fallbackParentId };
    }

    return axis;
  });
};

const buildAxisRows = (axes: TimelineAxis[]): AxisRow[] => {
  if (!axes.length) {
    return [];
  }

  const axisById = new Map<string, TimelineAxis>();
  axes.forEach((axis) => {
    axisById.set(axis.id, axis);
  });

  const childrenByParentId = new Map<string, TimelineAxis[]>();
  const rootAxes: TimelineAxis[] = [];

  axes.forEach((axis) => {
    const parentAxisId = axis.parentAxisId;
    if (parentAxisId && axisById.has(parentAxisId)) {
      const list = childrenByParentId.get(parentAxisId) ?? [];
      list.push(axis);
      childrenByParentId.set(parentAxisId, list);
      return;
    }
    rootAxes.push(axis);
  });

  const rows: AxisRow[] = [];
  const visited = new Set<string>();

  const visit = (axis: TimelineAxis, depth: number) => {
    if (visited.has(axis.id)) {
      return;
    }
    visited.add(axis.id);
    rows.push({ axis, depth });

    const children = [...(childrenByParentId.get(axis.id) ?? [])].sort(sortAxes);
    children.forEach((child) => {
      visit(child, depth + 1);
    });
  };

  [...rootAxes].sort(sortAxes).forEach((axis) => {
    visit(axis, 0);
  });

  [...axes]
    .filter((axis) => !visited.has(axis.id))
    .sort(sortAxes)
    .forEach((axis) => {
      visit(axis, 0);
    });

  return rows;
};

const buildLayout = (
  axes: TimelineAxis[],
  eras: TimelineEra[],
  segments: TimelineSegment[],
  yearPx: number
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

  return buildAxisRows(axes).map(({ axis, depth }, axisIndex) => {
    const axisEras = [...(erasByAxis.get(axis.id) ?? [])].sort(sortEras);

    const eraDefinitions = axisEras.map((era) => {
      const eraSegments = [...(segmentsByEra.get(era.id) ?? [])].sort(sortSegments);
      const segmentDefinitions = eraSegments.map((segment) => ({
        segment,
        duration: getSegmentDuration(segment),
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
    const axisX = AXIS_X + depth * AXIS_INDENT_STEP;
    const axisWidth = Math.max(Math.round(axisDuration * yearPx), AXIS_MIN_WIDTH);

    let eraCursor = axisStart;
    const eraLayouts: EraLayout[] = eraDefinitions.map((item) => {
      const eraStart = eraCursor;
      const eraEnd = eraStart + item.duration;
      eraCursor = eraEnd;

      const eraX = mapTickToX(eraStart, axisStart, axisEnd, axisX, axisWidth);
      const eraEndX = mapTickToX(eraEnd, axisStart, axisEnd, axisX, axisWidth);
      const eraWidth = Math.max(MIN_BAR_WIDTH, eraEndX - eraX);

      let segmentCursor = eraStart;
      const segmentLayouts: SegmentLayout[] = item.segments.map((segmentItem) => {
        const segmentStart = segmentCursor;
        const segmentEnd = segmentStart + segmentItem.duration;
        segmentCursor = segmentEnd;

        const segmentX = mapTickToX(
          segmentStart,
          axisStart,
          axisEnd,
          axisX,
          axisWidth
        );
        const segmentEndX = mapTickToX(
          segmentEnd,
          axisStart,
          axisEnd,
          axisX,
          axisWidth
        );

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
      depth,
      axisX,
      axisWidth,
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
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SelectedBoardNode | null>(null);
  const [dragNode, setDragNode] = useState<DragBoardNode | null>(null);
  const [dropHint, setDropHint] = useState<DropHint>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [visibleAxisTypes, setVisibleAxisTypes] = useState<AxisType[]>([
    ...AXIS_TYPES,
  ]);
  const [showMarkers, setShowMarkers] = useState(true);
  const [focusSelectedAxis, setFocusSelectedAxis] = useState(false);
  const [lockedFocusAxisId, setLockedFocusAxisId] = useState("");
  const [yearPx, setYearPx] = useState(1);
  const [yearPxInput, setYearPxInput] = useState("1");
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
  const [isExpanded, setIsExpanded] = useState(false);

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
      const [axisRes, eraRes, segmentRes, markerRes] = await Promise.all([
        loadAll((query) => getTimelineAxesPage(query)),
        loadAll((query) => getTimelineErasPage(query)),
        loadAll((query) => getTimelineSegmentsPage(query)),
        loadAll((query) => getTimelineMarkersPage(query)),
      ]);
      setAxes(axisRes);
      setEras(eraRes);
      setSegments(segmentRes);
      setMarkers(markerRes);
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const axisNameById = useMemo(() => {
    const map = new Map<string, string>();
    axes.forEach((axis) => {
      map.set(axis.id, axis.name);
    });
    return map;
  }, [axes]);

  const normalizedAxes = useMemo(() => normalizeAxesForHierarchy(axes), [axes]);

  useEffect(() => {
    if (!focusSelectedAxis || !lockedFocusAxisId) {
      return;
    }
    if (!normalizedAxes.some((axis) => axis.id === lockedFocusAxisId)) {
      setFocusSelectedAxis(false);
      setLockedFocusAxisId("");
    }
  }, [focusSelectedAxis, lockedFocusAxisId, normalizedAxes]);

  const eraById = useMemo(() => {
    const map = new Map<string, TimelineEra>();
    eras.forEach((era) => {
      map.set(era.id, era);
    });
    return map;
  }, [eras]);

  const segmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    segments.forEach((segment) => {
      map.set(segment.id, segment.name);
    });
    return map;
  }, [segments]);

  const filteredAxes = useMemo(
    () =>
      normalizedAxes.filter((axis) =>
        visibleAxisTypes.includes(axis.axisType as AxisType)
      ),
    [normalizedAxes, visibleAxisTypes]
  );

  const selectedAxisIdForFocus = useMemo(() => {
    if (!selectedNode) {
      return "";
    }
    if (selectedNode.kind === "axis") {
      return selectedNode.id;
    }
    if (selectedNode.kind === "era") {
      return eras.find((item) => item.id === selectedNode.id)?.axisId ?? "";
    }
    return segments.find((item) => item.id === selectedNode.id)?.axisId ?? "";
  }, [eras, segments, selectedNode]);

  const focusedAxisIds = useMemo(() => {
    if (!focusSelectedAxis || !lockedFocusAxisId) {
      return null;
    }
    const childrenByParentId = new Map<string, string[]>();
    normalizedAxes.forEach((axis) => {
      if (!axis.parentAxisId) {
        return;
      }
      const list = childrenByParentId.get(axis.parentAxisId) ?? [];
      list.push(axis.id);
      childrenByParentId.set(axis.parentAxisId, list);
    });

    const visibleIds = new Set<string>();
    const stack: string[] = [lockedFocusAxisId];
    while (stack.length) {
      const current = stack.pop()!;
      if (visibleIds.has(current)) {
        continue;
      }
      visibleIds.add(current);
      const children = childrenByParentId.get(current) ?? [];
      children.forEach((childId) => {
        if (!visibleIds.has(childId)) {
          stack.push(childId);
        }
      });
    }
    return visibleIds;
  }, [focusSelectedAxis, lockedFocusAxisId, normalizedAxes]);

  const axesForLayout = useMemo(() => {
    if (!focusedAxisIds) {
      return filteredAxes;
    }
    return filteredAxes.filter((axis) => focusedAxisIds.has(axis.id));
  }, [filteredAxes, focusedAxisIds]);

  const axisLayout = useMemo(
    () => buildLayout(axesForLayout, eras, segments, yearPx),
    [axesForLayout, eras, segments, yearPx]
  );

  const axisDurationById = useMemo(() => {
    const map = new Map<string, number>();
    axisLayout.forEach((axisNode) => {
      map.set(axisNode.axis.id, axisNode.duration);
    });
    return map;
  }, [axisLayout]);

  const eraDurationById = useMemo(() => {
    const map = new Map<string, number>();
    axisLayout.forEach((axisNode) => {
      axisNode.eras.forEach((eraNode) => {
        map.set(eraNode.era.id, eraNode.duration);
      });
    });
    return map;
  }, [axisLayout]);

  const segmentDurationById = useMemo(() => {
    const map = new Map<string, number>();
    axisLayout.forEach((axisNode) => {
      axisNode.eras.forEach((eraNode) => {
        eraNode.segments.forEach((segmentNode) => {
          map.set(segmentNode.segment.id, segmentNode.duration);
        });
      });
    });
    return map;
  }, [axisLayout]);

  const axisConnectors = useMemo<AxisConnector[]>(() => {
    const axisLayoutById = new Map<string, AxisLayout>();
    const segmentLayoutById = new Map<string, SegmentLayout>();
    axisLayout.forEach((item) => {
      axisLayoutById.set(item.axis.id, item);
      item.eras.forEach((eraNode) => {
        eraNode.segments.forEach((segmentNode) => {
          segmentLayoutById.set(segmentNode.segment.id, segmentNode);
        });
      });
    });

    return axisLayout.flatMap((item) => {
      const axisType = item.axis.axisType;
      if ((axisType !== "branch" && axisType !== "loop") || !item.axis.parentAxisId) {
        return [];
      }

      const parent = axisLayoutById.get(item.axis.parentAxisId);
      if (!parent) {
        return [];
      }

      let fromX = parent.axisX + parent.axisWidth;
      let fromY = parent.y + AXIS_BAR_HEIGHT / 2;
      if (axisType === "branch" && item.axis.originSegmentId) {
        const originSegment = segmentLayoutById.get(item.axis.originSegmentId);
        if (originSegment) {
          const offsetYears = isFiniteNumber(item.axis.originOffsetYears)
            ? Math.max(item.axis.originOffsetYears, 0)
            : 0;
          const ratio = clamp(offsetYears / Math.max(originSegment.duration, 1), 0, 1);
          fromX = originSegment.x + ratio * originSegment.width;
          fromY = originSegment.y + SEGMENT_BAR_HEIGHT / 2;
        }
      }
      const toX = item.axisX;
      const toY = item.y + AXIS_BAR_HEIGHT / 2;
      const controlX = (fromX + toX) / 2;
      const path = `M ${fromX} ${fromY} C ${controlX} ${fromY}, ${controlX} ${toY}, ${toX} ${toY}`;

      return [
        {
          id: `connector:${item.axis.id}:${parent.axis.id}`,
          axisId: item.axis.id,
          axisType,
          parentName: parent.axis.name,
          path,
          badgeX: controlX + 2,
          badgeY: (fromY + toY) / 2,
        },
      ];
    });
  }, [axisLayout]);

  const markerOffsetsBySegment = useMemo(() => {
    const segmentLayoutById = new Map<
      string,
      { start: number; end: number; width: number }
    >();
    axisLayout.forEach((axisNode) => {
      axisNode.eras.forEach((eraNode) => {
        eraNode.segments.forEach((segmentNode) => {
          segmentLayoutById.set(segmentNode.segment.id, {
            start: segmentNode.start,
            end: segmentNode.end,
            width: segmentNode.width,
          });
        });
      });
    });

    const map = new Map<
      string,
      Array<{ id: string; label: string; tick: number; offset: number }>
    >();
    [...markers].sort(sortMarkers).forEach((marker) => {
      const segmentLayout = segmentLayoutById.get(marker.segmentId);
      if (!segmentLayout) {
        return;
      }
      const ratio = clamp(
        (marker.tick - segmentLayout.start) /
          Math.max(segmentLayout.end - segmentLayout.start, 1),
        0,
        1
      );
      const list = map.get(marker.segmentId) ?? [];
      list.push({
        id: marker.id,
        label: marker.label,
        tick: marker.tick,
        offset: ratio * segmentLayout.width,
      });
      map.set(marker.segmentId, list);
    });
    return map;
  }, [axisLayout, markers]);

  const selectionSummary = useMemo<SelectionSummary | null>(() => {
    if (!selectedNode) {
      return null;
    }

    if (selectedNode.kind === "axis") {
      const axis = normalizedAxes.find((item) => item.id === selectedNode.id);
      if (!axis) {
        return null;
      }
      const axisType = axis.axisType as AxisType;
      const duration =
        axisDurationById.get(axis.id) ??
        getDurationFromRange(axis.startTick, axis.endTick, 1);
      const parentName = axis.parentAxisId
        ? axisNameById.get(axis.parentAxisId) ?? axis.parentAxisId
        : "-";

      return {
        title: axis.name,
        subtitle: t("Timeline Axis"),
        rows: [
          { label: t("Axis type"), value: t(AXIS_TYPE_LABELS[axisType] ?? "Main") },
          { label: t("Parent axis"), value: parentName },
          { label: t("Code"), value: axis.code?.trim() || "-" },
          { label: t("Duration"), value: `0 - ${Math.round(duration)}` },
          {
            label: t("Policy"),
            value: axis.policy?.trim() || t(AXIS_TYPE_POLICIES[axisType] ?? "-"),
          },
          {
            label: t("Origin segment"),
            value:
              axisType === "branch" && axis.originSegmentId
                ? segmentNameById.get(axis.originSegmentId) ?? axis.originSegmentId
                : "-",
          },
          {
            label: t("Origin offset years"),
            value:
              axisType === "branch" && isFiniteNumber(axis.originOffsetYears)
                ? String(axis.originOffsetYears)
                : "-",
          },
          {
            label: t("Status"),
            value: axis.status === "archived" ? t("Archived") : t("Active"),
          },
        ],
      };
    }

    if (selectedNode.kind === "era") {
      const era = eras.find((item) => item.id === selectedNode.id);
      if (!era) {
        return null;
      }
      const duration =
        eraDurationById.get(era.id) ?? getDurationFromRange(era.startTick, era.endTick, 1);
      const parentAxisName = axisNameById.get(era.axisId) ?? era.axisId;

      return {
        title: era.name,
        subtitle: t("Timeline Era"),
        rows: [
          { label: t("Parent axis"), value: parentAxisName },
          { label: t("Order"), value: isFiniteNumber(era.order) ? String(era.order) : "-" },
          { label: t("Code"), value: era.code?.trim() || "-" },
          { label: t("Duration"), value: `0 - ${Math.round(duration)}` },
          { label: t("Fixed range"), value: formatTickRange(era.startTick, era.endTick) },
          {
            label: t("Status"),
            value: era.status === "archived" ? t("Archived") : t("Active"),
          },
        ],
      };
    }

    const segment = segments.find((item) => item.id === selectedNode.id);
    if (!segment) {
      return null;
    }
    const duration =
      segmentDurationById.get(segment.id) ??
      getDurationFromRange(segment.startTick, segment.endTick, 1);
    const parentEraName = eraById.get(segment.eraId)?.name ?? segment.eraId;
    const parentAxisName = axisNameById.get(segment.axisId) ?? segment.axisId;

    return {
      title: segment.name,
      subtitle: t("Timeline Segment"),
      rows: [
        { label: t("Parent axis"), value: parentAxisName },
        { label: t("Parent era"), value: parentEraName },
        {
          label: t("Order"),
          value: isFiniteNumber(segment.order) ? String(segment.order) : "-",
        },
        { label: t("Code"), value: segment.code?.trim() || "-" },
        { label: t("Duration"), value: `0 - ${Math.round(duration)}` },
        { label: t("Fixed range"), value: formatTickRange(segment.startTick, segment.endTick) },
        {
          label: t("Status"),
          value: segment.status === "archived" ? t("Archived") : t("Active"),
        },
      ],
    };
  }, [
    axisDurationById,
    axisNameById,
    eraById,
    eraDurationById,
    eras,
    normalizedAxes,
    segmentNameById,
    segmentDurationById,
    segments,
    selectedNode,
    t,
  ]);

  const canvasSize = useMemo(() => {
    const maxRightEdge = axisLayout.reduce(
      (max, axisNode) => Math.max(max, axisNode.axisX + axisNode.axisWidth),
      AXIS_X + AXIS_WIDTH
    );
    const width = maxRightEdge + 240;
    const height = Math.max(TOP_PADDING + axisLayout.length * ROW_HEIGHT + 60, 420);
    return { width, height };
  }, [axisLayout]);

  const toggleAxisTypeFilter = (axisType: AxisType) => {
    setVisibleAxisTypes((prev) => {
      if (prev.includes(axisType)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((item) => item !== axisType);
      }
      return [...prev, axisType];
    });
  };

  const resetAxisTypeFilter = () => {
    setVisibleAxisTypes([...AXIS_TYPES]);
  };

  const applyYearPx = (rawValue: string) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      setYearPxInput(String(yearPx));
      return;
    }
    const clamped = clamp(roundToStep(parsed), YEAR_PX_MIN, YEAR_PX_MAX);
    const normalized = Number(clamped.toFixed(2));
    setYearPx(normalized);
    setYearPxInput(String(normalized));
  };

  const adjustYearPx = (delta: number) => {
    const next = clamp(roundToStep(yearPx + delta), YEAR_PX_MIN, YEAR_PX_MAX);
    const normalized = Number(next.toFixed(2));
    setYearPx(normalized);
    setYearPxInput(String(normalized));
  };

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
    durationYears: getSegmentDuration(segment),
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
    const maxX =
      axisLayout.reduce(
        (max, axisNode) => Math.max(max, axisNode.axisX + axisNode.axisWidth),
        AXIS_X + AXIS_WIDTH
      ) + 80;

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
    if (
      target.closest(".timeline-board-expand") ||
      target.closest(".timeline-structure-board-navbar")
    ) {
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

  useEffect(() => {
    document.body.style.overflow = isExpanded ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  const toggleExpandedBoard = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="timeline-structure-board-wrap">
      <div className="card timeline-structure-board-head">
        <div className="timeline-structure-board-head__content">
          <div className="timeline-structure-board-head__intro">
            <h3 className="section-title">{t("Timeline board")}</h3>
            <p className="header__subtitle">
              {t(
                "Each axis is a main horizontal bar. Eras are smaller bars under the axis, and segments are nested bars inside each era."
              )}
            </p>
            <div className="timeline-structure-legend">
              {AXIS_TYPES.map((axisType) => (
                <span
                  key={axisType}
                  className={`timeline-structure-legend__item timeline-structure-legend__item--${axisType}`}
                >
                  {t(AXIS_TYPE_LABELS[axisType])}
                </span>
              ))}
            </div>
          </div>

          <div className="timeline-structure-selection">
            <h4 className="timeline-structure-selection__title">{t("Selection summary")}</h4>
            {selectionSummary ? (
              <>
                <p className="timeline-structure-selection__node">
                  <strong>{selectionSummary.title}</strong>
                  <span>{selectionSummary.subtitle}</span>
                </p>
                <dl className="timeline-structure-selection__list">
                  {selectionSummary.rows.map((row) => (
                    <div key={`${row.label}:${row.value}`} className="timeline-structure-selection__row">
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="timeline-structure-selection__empty">
                {t("Select axis, era, or segment on the board to view quick details.")}
              </p>
            )}
          </div>
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
        className={`timeline-board timeline-structure-board${
          isExpanded ? " timeline-structure-board--expanded" : ""
        }`}
        ref={boardRef}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div className="timeline-structure-board-navbar">
          {AXIS_TYPES.map((axisType) => (
            <button
              key={`nav-filter-${axisType}`}
              type="button"
              className={`timeline-structure-filter${
                visibleAxisTypes.includes(axisType) ? " timeline-structure-filter--active" : ""
              }`}
              onClick={() => toggleAxisTypeFilter(axisType)}
            >
              {t(AXIS_TYPE_LABELS[axisType])}
            </button>
          ))}
          <button
            type="button"
            className="timeline-structure-filter timeline-structure-filter--ghost"
            onClick={resetAxisTypeFilter}
          >
            {t("Show all")}
          </button>
          <button
            type="button"
            className={`timeline-structure-filter${
              showMarkers ? " timeline-structure-filter--active" : ""
            }`}
            onClick={() => setShowMarkers((prev) => !prev)}
          >
            {showMarkers ? t("Hide markers") : t("Show markers")}
          </button>
          <button
            type="button"
            className={`timeline-structure-filter${
              focusSelectedAxis ? " timeline-structure-filter--active" : ""
            }`}
            disabled={!focusSelectedAxis && !selectedAxisIdForFocus}
            onClick={() => {
              if (focusSelectedAxis) {
                setFocusSelectedAxis(false);
                setLockedFocusAxisId("");
                return;
              }
              if (!selectedAxisIdForFocus) {
                return;
              }
              setLockedFocusAxisId(selectedAxisIdForFocus);
              setFocusSelectedAxis(true);
            }}
            title={
              focusSelectedAxis || selectedAxisIdForFocus
                ? t("Focus current axis and descendants")
                : t("Select an axis, era, or segment first")
            }
          >
            {t("Focus selected axis")}
          </button>
          <div className="timeline-structure-scale">
            <button
              type="button"
              className="timeline-structure-scale__btn"
              onClick={() => adjustYearPx(-YEAR_PX_STEP)}
              title={t("Decrease timeline scale")}
            >
              -
            </button>
            <label className="timeline-structure-scale__label">
              <input
                type="number"
                min={YEAR_PX_MIN}
                max={YEAR_PX_MAX}
                step={YEAR_PX_STEP}
                value={yearPxInput}
                onChange={(event) => setYearPxInput(event.target.value)}
                onBlur={() => applyYearPx(yearPxInput)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyYearPx(yearPxInput);
                  }
                }}
                className="timeline-structure-scale__input"
              />
              <span>px/year</span>
            </label>
            <button
              type="button"
              className="timeline-structure-scale__btn"
              onClick={() => adjustYearPx(YEAR_PX_STEP)}
              title={t("Increase timeline scale")}
            >
              +
            </button>
          </div>
        </div>
        <BoardViewportControls
          zoom={scale}
          onZoomOut={() => zoomBy(-0.12)}
          onZoomIn={() => zoomBy(0.12)}
          onFit={() => fitToRect(contentBounds, 24)}
          onReset={resetView}
          className="timeline-structure-board__viewport-tools"
          minimapTitle={SHOW_MINIMAP ? t("Mini map") : undefined}
          minimap={
            SHOW_MINIMAP ? (
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
                    x={MINIMAP_PADDING + (axisNode.axisX - contentBounds.x) * minimapScale}
                    y={
                      MINIMAP_HEADER_HEIGHT +
                      MINIMAP_PADDING +
                      (axisNode.y - contentBounds.y) * minimapScale
                    }
                    width={axisNode.axisWidth * minimapScale}
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
            ) : undefined
          }
        />
        <button
          type="button"
          className="timeline-board-expand"
          onClick={toggleExpandedBoard}
          title={isExpanded ? t("Exit board mode") : t("Expand board")}
          aria-label={isExpanded ? t("Exit board mode") : t("Expand board")}
        >
          <img
            src={isExpanded ? fullscreenExitIcon : fullscreenIcon}
            alt=""
            className="timeline-board-expand__icon"
            aria-hidden="true"
          />
        </button>

        <div
          className="timeline-board__canvas"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          }}
        >
          <svg
            className="timeline-structure-links"
            width={canvasSize.width}
            height={canvasSize.height}
            aria-hidden="true"
          >
            <defs>
              <marker
                id="timeline-link-arrow-branch"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" className="timeline-structure-link-arrow timeline-structure-link-arrow--branch" />
              </marker>
              <marker
                id="timeline-link-arrow-loop"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" className="timeline-structure-link-arrow timeline-structure-link-arrow--loop" />
              </marker>
            </defs>

            {axisConnectors.map((connector) => (
              <g key={connector.id}>
                <path
                  d={connector.path}
                  className={[
                    "timeline-structure-link",
                    `timeline-structure-link--${connector.axisType}`,
                    selectedNode?.kind === "axis" && selectedNode.id === connector.axisId
                      ? "timeline-structure-link--selected"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  markerEnd={`url(#timeline-link-arrow-${connector.axisType})`}
                />
                <text
                  x={connector.badgeX}
                  y={connector.badgeY - 4}
                  className={`timeline-structure-link-label timeline-structure-link-label--${connector.axisType}`}
                >
                  {connector.axisType === "loop"
                    ? `${t("Loop")} ↺ ${connector.parentName}`
                    : `${t("Branch")} ← ${connector.parentName}`}
                </text>
              </g>
            ))}
          </svg>

          {axisLayout.length === 0 ? (
            <p className="timeline-empty" style={{ transform: "translate(32px, 26px)" }}>
              {t("No timeline-first structures yet.")}
            </p>
          ) : null}

          {axisLayout.map((axisNode) => (
            <div key={axisNode.axis.id}>
              <div
                className="timeline-structure-axis-label"
                style={{
                  transform: `translate(${24 + axisNode.depth * AXIS_INDENT_STEP}px, ${
                    axisNode.y - 2
                  }px)`,
                }}
              >
                <div className="timeline-structure-axis-label__title">
                  <strong>{axisNode.axis.name}</strong>
                  <span
                    className={`timeline-structure-axis-tag timeline-structure-axis-tag--${axisNode.axis.axisType}`}
                  >
                    {t(AXIS_TYPE_LABELS[axisNode.axis.axisType as AxisType] ?? "Main")}
                  </span>
                </div>
                {axisNode.axis.parentAxisId ? (
                  <span className="timeline-structure-axis-label__parent">
                    {t("Parent")}:{" "}
                    {axisNameById.get(axisNode.axis.parentAxisId) ??
                      axisNode.axis.parentAxisId}
                  </span>
                ) : null}
              </div>

              <div
                className={[
                  "timeline-structure-node",
                  "timeline-structure-node--axis",
                  `timeline-structure-node--axis-${axisNode.axis.axisType}`,
                  selectedNode?.kind === "axis" && selectedNode.id === axisNode.axis.id
                    ? "timeline-structure-node--selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  width: axisNode.axisWidth,
                  transform: `translate(${axisNode.axisX}px, ${axisNode.y}px)`,
                }}
                aria-label={`${axisNode.axis.name}: ${Math.round(axisNode.start)} - ${Math.round(
                  axisNode.end
                )}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNode({ kind: "axis", id: axisNode.axis.id });
                }}
              >
                <span className="timeline-structure-axis-year timeline-structure-axis-year--start">
                  {Math.round(axisNode.start)}
                </span>
                <span className="timeline-structure-axis-year timeline-structure-axis-year--end">
                  {Math.round(axisNode.end)}
                </span>
                <span className="timeline-structure-axis-line" aria-hidden="true" />
                <span className="timeline-structure-axis-start-tick" aria-hidden="true" />
                <span className="timeline-structure-axis-arrow" aria-hidden="true" />
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
                      setAlignedDragImage(event);
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
                        setAlignedDragImage(event);
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
                      {(markerOffsetsBySegment.get(segmentNode.segment.id) ?? []).map(
                        (marker) =>
                          showMarkers ? (
                            <span
                              key={marker.id}
                              className="timeline-structure-segment-marker"
                              style={{ left: `${marker.offset}px` }}
                              title={`${marker.label} (${marker.tick})`}
                              aria-label={`${marker.label} (${marker.tick})`}
                            />
                          ) : null
                      )}
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
