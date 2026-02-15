import {
  type PointerEvent,
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Rank, RankCondition, RankPreviousLink } from "./rank.types";

export type RankLinkSelection = {
  currentId: string;
  previousId: string;
  conditions?: RankCondition[];
};

type RankBoardProps = {
  items: Rank[];
  links: Record<string, RankPreviousLink[]>;
  selectedId?: string;
  selectedLink?: { currentId: string; previousId: string } | null;
  initialPositions?: Record<string, Position>;
  initialLinkBends?: Record<string, LinkBend>;
  initialConditionNodePositions?: Record<string, Position>;
  onSelect?: (item: Rank | null) => void;
  onSelectLink?: (link: RankLinkSelection | null) => void;
  onLink: (currentId: string, previousId: string) => void;
  onUnlink: (currentId: string, previousId: string) => void;
  onPositionsChange?: (positions: Record<string, Position>) => void;
  onLinkBendsChange?: (linkBends: Record<string, LinkBend>) => void;
  onConditionNodePositionsChange?: (
    conditionNodePositions: Record<string, Position>
  ) => void;
  onColorChange?: (id: string, color: string) => void;
  isSavingColor?: boolean;
};

type Position = { x: number; y: number };
type LinkBend = { midX: number };

type SnapTarget = { targetId: string };

type Span = { min: number; max: number };

type WorldBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

type ConditionNode = {
  id: string;
  linkKey: string;
  parentId: string;
  childId: string;
  condition: RankCondition;
  x: number;
  y: number;
  width: number;
  height: number;
};

type BoardEdge = {
  id: string;
  linkKey: string;
  parentId: string;
  childId: string;
  path: string;
};

type LinkHandle = {
  linkKey: string;
  parentId: string;
  childId: string;
  x: number;
  y: number;
};

const NODE_WIDTH = 160;
const NODE_HEIGHT = 34;
const H_GAP = 120;
const V_GAP = 60;
const CONDITION_WIDTH = 128;
const CONDITION_HEIGHT = 26;
const CONDITION_GAP = 8;
const PADDING = 32;
const SNAP_DISTANCE = 30;
const ALIGN_SNAP_DISTANCE = 14;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.4;
const DEFAULT_PAN = { x: 24, y: 24 };

const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MINIMAP_PADDING = 10;
const MINIMAP_HEADER_HEIGHT = 20;

const toRgb = (hex: string) => {
  const cleaned = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(cleaned)) {
    return null;
  }
  const normalized =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((char) => char + char)
          .join("")
      : cleaned;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
};

const getContrastColor = (hex: string) => {
  const rgb = toRgb(hex);
  if (!rgb) {
    return undefined;
  }
  const { r, g, b } = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55 ? "#ffffff" : "#1b1b1b";
};

const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

const normalizeConditions = (conditions?: RankCondition[]): RankCondition[] => {
  if (!conditions?.length) {
    return [];
  }
  return conditions
    .map((item) => ({
      name: item.name?.trim() ?? "",
      description: item.description?.trim() ?? undefined,
    }))
    .filter((item) => item.name.length > 0);
};

const buildOrthPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  midX?: number
): string => {
  const resolvedMidX = midX ?? startX + (endX - startX) / 2;
  return `M ${startX} ${startY} H ${resolvedMidX} V ${endY} H ${endX}`;
};

const clampMidX = (midX: number, startX: number, endX: number): number => {
  const minX = Math.min(startX, endX) + 24;
  const maxX = Math.max(startX, endX) - 24;
  if (minX > maxX) {
    return startX + (endX - startX) / 2;
  }
  return Math.max(minX, Math.min(maxX, midX));
};

const resolveMidX = (
  startX: number,
  endX: number,
  bend?: LinkBend
): number => {
  const fallback = startX + (endX - startX) / 2;
  if (!bend || !Number.isFinite(bend.midX)) {
    return clampMidX(fallback, startX, endX);
  }
  return clampMidX(bend.midX, startX, endX);
};

const getDefaultMidX = (startX: number, endX: number) => {
  return startX + (endX - startX) / 2;
};

const shouldKeepBend = (midX: number, startX: number, endX: number): boolean => {
  return Math.abs(midX - getDefaultMidX(startX, endX)) > 4;
};

const toHandleId = (linkKey: string) => `bend-${linkKey}`;

const isFiniteMidX = (value: unknown): value is LinkBend =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as { midX?: unknown }).midX === "number" &&
      Number.isFinite((value as { midX: number }).midX)
  );

const sanitizeLinkBends = (
  value: Record<string, LinkBend> | undefined
): Record<string, LinkBend> => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const next: Record<string, LinkBend> = {};
  Object.entries(value).forEach(([key, bend]) => {
    if (isFiniteMidX(bend)) {
      next[key] = { midX: bend.midX };
    }
  });
  return next;
};

const sanitizeConditionNodePositions = (
  value: Record<string, Position> | undefined
): Record<string, Position> => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const next: Record<string, Position> = {};
  Object.entries(value).forEach(([key, pos]) => {
    if (
      pos &&
      typeof pos === "object" &&
      !Array.isArray(pos) &&
      typeof pos.x === "number" &&
      typeof pos.y === "number" &&
      Number.isFinite(pos.x) &&
      Number.isFinite(pos.y)
    ) {
      next[key] = { x: pos.x, y: pos.y };
    }
  });
  return next;
};

const mergeLinkBendsForLink = (
  current: Record<string, LinkBend>,
  linkKey: string,
  startX: number,
  endX: number,
  pointerX: number
) => {
  const midX = clampMidX(pointerX, startX, endX);
  const next = { ...current };
  if (shouldKeepBend(midX, startX, endX)) {
    next[linkKey] = { midX };
  } else {
    delete next[linkKey];
  }
  return next;
};

const buildLinkSegmentPath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number
): string => buildOrthPath(startX, startY, endX, endY);

export const RankBoard = ({
  items,
  links,
  selectedId,
  selectedLink,
  initialPositions,
  initialLinkBends,
  initialConditionNodePositions,
  onSelect,
  onSelectLink,
  onLink,
  onUnlink,
  onPositionsChange,
  onLinkBendsChange,
  onConditionNodePositionsChange,
  onColorChange,
  isSavingColor = false,
}: RankBoardProps) => {
  const { t } = useI18n();
  const boardRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [manualPositions, setManualPositions] = useState<Record<string, Position>>({});
  const [manualLinkBends, setManualLinkBends] = useState<Record<string, LinkBend>>({});
  const [manualConditionNodePositions, setManualConditionNodePositions] = useState<
    Record<string, Position>
  >({});

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState<Position | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [snapTarget, setSnapTarget] = useState<SnapTarget | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<Position>(DEFAULT_PAN);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });

  const [isMinimapDragging, setIsMinimapDragging] = useState(false);
  const [draggingBend, setDraggingBend] = useState<LinkHandle | null>(null);
  const [draggingConditionNodeId, setDraggingConditionNodeId] = useState<string | null>(null);
  const [conditionDragOffset, setConditionDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [conditionDragStart, setConditionDragStart] = useState<Position>({ x: 0, y: 0 });
  const [conditionDragPosition, setConditionDragPosition] = useState<Position | null>(null);
  const [hasDraggedCondition, setHasDraggedCondition] = useState(false);

  const scaleRef = useRef(1);
  const panRef = useRef<Position>(DEFAULT_PAN);
  const rafRef = useRef<number | null>(null);
  const splitRef = useRef(false);
  const suppressClickRef = useRef(false);

  const itemsWithId = useMemo(
    () => items.filter((item): item is Rank & { id: string } => Boolean(item.id)),
    [items]
  );

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setManualPositions(initialPositions ?? {});
  }, [initialPositions]);

  useEffect(() => {
    setManualLinkBends(sanitizeLinkBends(initialLinkBends));
  }, [initialLinkBends]);

  useEffect(() => {
    setManualConditionNodePositions(
      sanitizeConditionNodePositions(initialConditionNodePositions)
    );
  }, [initialConditionNodePositions]);

  useEffect(() => {
    const node = boardRef.current;
    if (!node) {
      return;
    }
    const update = () => {
      setViewportSize({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = boardRef.current;
    if (!node) {
      return;
    }
    const handleWheelNative = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = node.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const nextScale = scaleRef.current - event.deltaY * 0.001;
      setZoomAtPointer(nextScale, pointerX, pointerY);
    };
    node.addEventListener("wheel", handleWheelNative, {
      passive: false,
      capture: true,
    });
    return () => node.removeEventListener("wheel", handleWheelNative, true);
  }, []);

  const { incomingById, childrenById, roots, linkConditionsByKey } = useMemo(() => {
    const byId = new Map<string, Rank & { id: string }>();
    const incomingMap: Record<string, string[]> = {};
    const childrenMap: Record<string, string[]> = {};
    const conditionsMap: Record<string, RankCondition[] | undefined> = {};

    itemsWithId.forEach((item) => {
      byId.set(item.id, item);
    });

    itemsWithId.forEach((item) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(links, item.id);
      const configured =
        hasOverride
          ? links[item.id] ?? []
          : item.previousLinks ?? (item.previousId
            ? [{ previousId: item.previousId, conditions: item.conditions }]
            : []);
      incomingMap[item.id] = configured
        .map((link) => link.previousId)
        .filter((previousId) => Boolean(previousId));
      configured.forEach((link) => {
        const normalized = normalizeConditions(link.conditions);
        if (normalized.length > 0) {
          conditionsMap[`${link.previousId}-${item.id}`] = normalized;
        }
      });
    });

    Object.entries(incomingMap).forEach(([childId, parents]) => {
      parents.forEach((parentId) => {
        if (!parentId) {
          return;
        }
        if (!childrenMap[parentId]) {
          childrenMap[parentId] = [];
        }
        childrenMap[parentId]?.push(childId);
      });
    });

    Object.values(childrenMap).forEach((children) => {
      children.sort((a, b) => {
        const aName = byId.get(a)?.name ?? "";
        const bName = byId.get(b)?.name ?? "";
        return aName.localeCompare(bName);
      });
    });

    const rootIds = itemsWithId
      .filter((item) => {
        const parents = incomingMap[item.id] ?? [];
        if (parents.length === 0) {
          return true;
        }
        return parents.every((parentId) => !byId.has(parentId));
      })
      .map((item) => item.id)
      .sort((a, b) => {
        const aName = byId.get(a)?.name ?? "";
        const bName = byId.get(b)?.name ?? "";
        return aName.localeCompare(bName);
      });

    return {
      incomingById: incomingMap,
      childrenById: childrenMap,
      roots: rootIds,
      linkConditionsByKey: conditionsMap,
    };
  }, [itemsWithId, links]);

  const autoLayout = useMemo(() => {
    const positions: Record<string, Position> = {};
    let maxX = 0;
    let maxY = 0;
    const visiting = new Set<string>();
    let yCursor = PADDING;

    const placeLeaf = (id: string, depth: number): Span => {
      const x = PADDING + depth * (NODE_WIDTH + H_GAP);
      const y = yCursor;
      positions[id] = { x, y };
      yCursor += NODE_HEIGHT + V_GAP;
      maxX = Math.max(maxX, x + NODE_WIDTH);
      maxY = Math.max(maxY, y + NODE_HEIGHT);
      return { min: y, max: y + NODE_HEIGHT };
    };

    const layoutNode = (id: string, depth: number): Span => {
      if (positions[id]) {
        return { min: positions[id].y, max: positions[id].y + NODE_HEIGHT };
      }
      if (visiting.has(id)) {
        return placeLeaf(id, depth);
      }
      visiting.add(id);
      const children = childrenById[id] ?? [];
      if (children.length === 0) {
        visiting.delete(id);
        return placeLeaf(id, depth);
      }

      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;
      const childSpans = children.map((childId) => layoutNode(childId, depth + 1));
      childSpans.forEach((span) => {
        min = Math.min(min, span.min);
        max = Math.max(max, span.max);
      });

      const x = PADDING + depth * (NODE_WIDTH + H_GAP);
      const y = min + (max - min - NODE_HEIGHT) / 2;
      positions[id] = { x, y };
      maxX = Math.max(maxX, x + NODE_WIDTH);
      maxY = Math.max(maxY, y + NODE_HEIGHT);
      visiting.delete(id);
      return {
        min: Math.min(min, y),
        max: Math.max(max, y + NODE_HEIGHT),
      };
    };

    roots.forEach((rootId) => {
      layoutNode(rootId, 0);
      yCursor += V_GAP;
    });

    itemsWithId.forEach((item) => {
      if (!positions[item.id]) {
        layoutNode(item.id, 0);
      }
    });

    const width = Math.max(maxX + PADDING, NODE_WIDTH + PADDING * 2);
    const height = Math.max(maxY + PADDING, NODE_HEIGHT + PADDING * 2);

    return { positions, width, height };
  }, [childrenById, itemsWithId, roots]);

  const selectedItem = useMemo(
    () => itemsWithId.find((item) => item.id === selectedId) ?? null,
    [itemsWithId, selectedId]
  );

  const selectedLinkKey = selectedLink
    ? `${selectedLink.previousId}-${selectedLink.currentId}`
    : null;

  const positionById = useMemo(() => {
    const base: Record<string, Position> = {};
    itemsWithId.forEach((item) => {
      base[item.id] =
        manualPositions[item.id] ?? autoLayout.positions[item.id] ?? { x: PADDING, y: PADDING };
    });
    if (draggingId && dragPosition) {
      base[draggingId] = dragPosition;
    }
    return base;
  }, [itemsWithId, manualPositions, autoLayout.positions, draggingId, dragPosition]);

  const { edgeList, conditionNodes, linkHandles } = useMemo(() => {
    const nextEdges: BoardEdge[] = [];
    const nextConditionNodes: ConditionNode[] = [];
    const nextHandles: LinkHandle[] = [];

    Object.entries(incomingById).forEach(([childId, parentIds]) => {
      parentIds.forEach((parentId) => {
        const childPos = positionById[childId];
        const parentPos = positionById[parentId];
        if (!childPos || !parentPos) {
          return;
        }

        const linkKey = `${parentId}-${childId}`;
        const startX = parentPos.x + NODE_WIDTH;
        const startY = parentPos.y + NODE_HEIGHT / 2;
        const endX = childPos.x;
        const endY = childPos.y + NODE_HEIGHT / 2;
        const midX = resolveMidX(startX, endX, manualLinkBends[linkKey]);

        nextHandles.push({
          linkKey,
          parentId,
          childId,
          x: midX,
          y: startY + (endY - startY) / 2,
        });

        const conditions = linkConditionsByKey[linkKey] ?? [];
        if (conditions.length === 0) {
          nextEdges.push({
            id: `${linkKey}-direct`,
            linkKey,
            parentId,
            childId,
            path: buildOrthPath(startX, startY, endX, endY, midX),
          });
          return;
        }

        const totalHeight =
          conditions.length * CONDITION_HEIGHT +
          Math.max(0, conditions.length - 1) * CONDITION_GAP;
        const topY = (startY + endY) / 2 - totalHeight / 2;
        const nodeX = midX - CONDITION_WIDTH / 2;

        conditions.forEach((condition, index) => {
          const nodeId = `${linkKey}-condition-${index + 1}`;
          const defaultNodeY = topY + index * (CONDITION_HEIGHT + CONDITION_GAP);
          const defaultNodeX = nodeX;
          const manualPos = manualConditionNodePositions[nodeId];
          const draggedPos =
            draggingConditionNodeId === nodeId ? conditionDragPosition : null;
          const resolvedPos = draggedPos ?? manualPos;
          const nodeXResolved = resolvedPos?.x ?? defaultNodeX;
          const nodeYResolved = resolvedPos?.y ?? defaultNodeY;
          const conditionNode: ConditionNode = {
            id: nodeId,
            linkKey,
            parentId,
            childId,
            condition,
            x: nodeXResolved,
            y: nodeYResolved,
            width: CONDITION_WIDTH,
            height: CONDITION_HEIGHT,
          };
          nextConditionNodes.push(conditionNode);

          const conditionInputX = conditionNode.x;
          const conditionOutputX = conditionNode.x + conditionNode.width;
          const conditionMidY = conditionNode.y + conditionNode.height / 2;

          nextEdges.push({
            id: `${nodeId}-in`,
            linkKey,
            parentId,
            childId,
            path: buildLinkSegmentPath(startX, startY, conditionInputX, conditionMidY),
          });
          nextEdges.push({
            id: `${nodeId}-out`,
            linkKey,
            parentId,
            childId,
            path: buildLinkSegmentPath(conditionOutputX, conditionMidY, endX, endY),
          });
        });
      });
    });

    return { edgeList: nextEdges, conditionNodes: nextConditionNodes, linkHandles: nextHandles };
  }, [
    conditionDragPosition,
    draggingConditionNodeId,
    incomingById,
    linkConditionsByKey,
    manualConditionNodePositions,
    manualLinkBends,
    positionById,
  ]);

  const conditionNodeByEdgeId = useMemo(() => {
    const map = new Map<string, ConditionNode>();
    conditionNodes.forEach((node) => {
      map.set(`${node.id}-in`, node);
      map.set(`${node.id}-out`, node);
    });
    return map;
  }, [conditionNodes]);

  const worldBounds = useMemo<WorldBounds>(() => {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    const include = (x: number, y: number, width: number, height: number) => {
      minX = Math.min(minX, x - PADDING);
      minY = Math.min(minY, y - PADDING);
      maxX = Math.max(maxX, x + width + PADDING);
      maxY = Math.max(maxY, y + height + PADDING);
    };

    itemsWithId.forEach((item) => {
      const pos = positionById[item.id];
      if (!pos) {
        return;
      }
      include(pos.x, pos.y, NODE_WIDTH, NODE_HEIGHT);
    });

    conditionNodes.forEach((node) => {
      include(node.x, node.y, node.width, node.height);
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      return {
        minX: 0,
        minY: 0,
        maxX: autoLayout.width,
        maxY: autoLayout.height,
        width: Math.max(1, autoLayout.width),
        height: Math.max(1, autoLayout.height),
      };
    }

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  }, [autoLayout.height, autoLayout.width, conditionNodes, itemsWithId, positionById]);

  const minimapMetrics = useMemo(() => {
    const availableWidth = Math.max(1, MINIMAP_WIDTH - MINIMAP_PADDING * 2);
    const availableHeight = Math.max(
      1,
      MINIMAP_HEIGHT - MINIMAP_HEADER_HEIGHT - MINIMAP_PADDING * 2
    );
    const contentScale = Math.min(
      availableWidth / worldBounds.width,
      availableHeight / worldBounds.height
    );
    const safeScale = Number.isFinite(contentScale) && contentScale > 0 ? contentScale : 1;
    const contentWidth = worldBounds.width * safeScale;
    const contentHeight = worldBounds.height * safeScale;
    const originX = (MINIMAP_WIDTH - contentWidth) / 2;
    const graphTop = MINIMAP_HEADER_HEIGHT + MINIMAP_PADDING;
    const originY = graphTop + (availableHeight - contentHeight) / 2;
    const graphBottom = MINIMAP_HEIGHT - MINIMAP_PADDING;
    return {
      scale: safeScale,
      contentWidth,
      contentHeight,
      originX,
      originY,
      graphTop,
      graphBottom,
    };
  }, [worldBounds.height, worldBounds.width]);

  const viewportWorld = useMemo(() => {
    const width = viewportSize.width > 0 ? viewportSize.width / scale : 0;
    const height = viewportSize.height > 0 ? viewportSize.height / scale : 0;
    const x = -pan.x / scale;
    const y = -pan.y / scale;
    return { x, y, width, height };
  }, [pan.x, pan.y, scale, viewportSize.height, viewportSize.width]);

  const minimapViewportRect = useMemo(() => {
    const rawX =
      minimapMetrics.originX + (viewportWorld.x - worldBounds.minX) * minimapMetrics.scale;
    const rawY =
      minimapMetrics.originY + (viewportWorld.y - worldBounds.minY) * minimapMetrics.scale;

    const width = Math.min(
      minimapMetrics.contentWidth,
      Math.max(6, viewportWorld.width * minimapMetrics.scale)
    );
    const height = Math.min(
      minimapMetrics.contentHeight,
      Math.max(6, viewportWorld.height * minimapMetrics.scale)
    );

    const minX = minimapMetrics.originX;
    const minY = minimapMetrics.originY;
    const maxX = minimapMetrics.originX + minimapMetrics.contentWidth - width;
    const maxY = minimapMetrics.originY + minimapMetrics.contentHeight - height;

    const x = Math.max(minX, Math.min(maxX, rawX));
    const y = Math.max(minY, Math.min(maxY, rawY));
    return { x, y, width, height };
  }, [
    minimapMetrics.contentHeight,
    minimapMetrics.contentWidth,
    minimapMetrics.originX,
    minimapMetrics.originY,
    minimapMetrics.scale,
    viewportWorld.height,
    viewportWorld.width,
    viewportWorld.x,
    viewportWorld.y,
    worldBounds.minX,
    worldBounds.minY,
  ]);

  const setZoomAtPointer = (nextScale: number, pointerX: number, pointerY: number) => {
    const currentScale = scaleRef.current;
    const clamped = clampScale(nextScale);
    if (clamped === currentScale) {
      return;
    }
    const currentPan = panRef.current;
    const ratio = clamped / currentScale;
    const nextPanX = pointerX - (pointerX - currentPan.x) * ratio;
    const nextPanY = pointerY - (pointerY - currentPan.y) * ratio;
    scaleRef.current = clamped;
    panRef.current = { x: nextPanX, y: nextPanY };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        setScale(scaleRef.current);
        setPan(panRef.current);
        rafRef.current = null;
      });
    }
  };

  const toBoardCoords = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    const rawX = clientX - (rect?.left ?? 0);
    const rawY = clientY - (rect?.top ?? 0);
    return {
      x: (rawX - pan.x) / scale,
      y: (rawY - pan.y) / scale,
    };
  };

  const moveViewportFromMinimap = (clientX: number, clientY: number) => {
    const rect = minimapRef.current?.getBoundingClientRect();
    if (!rect || minimapMetrics.scale <= 0) {
      return;
    }
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const clampedX = Math.min(
      minimapMetrics.originX + minimapMetrics.contentWidth,
      Math.max(minimapMetrics.originX, localX)
    );
    const clampedY = Math.min(
      minimapMetrics.originY + minimapMetrics.contentHeight,
      Math.max(minimapMetrics.originY, localY)
    );
    const worldX =
      worldBounds.minX + (clampedX - minimapMetrics.originX) / minimapMetrics.scale;
    const worldY =
      worldBounds.minY + (clampedY - minimapMetrics.originY) / minimapMetrics.scale;
    const nextPan = {
      x: viewportSize.width / 2 - worldX * scaleRef.current,
      y: viewportSize.height / 2 - worldY * scaleRef.current,
    };
    panRef.current = nextPan;
    setPan(nextPan);
  };

  const handlePointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    item: Rank & { id: string }
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = positionById[item.id] ?? { x: PADDING, y: PADDING };
    const { x: pointerX, y: pointerY } = toBoardCoords(event.clientX, event.clientY);
    setDragOffset({ x: pointerX - position.x, y: pointerY - position.y });
    setDragStart({ x: pointerX, y: pointerY });
    setDragPosition(position);
    setHasDragged(false);
    setDraggingId(item.id);
    splitRef.current = event.shiftKey;
    onSelectLink?.(null);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (isMinimapDragging) {
      moveViewportFromMinimap(event.clientX, event.clientY);
      return;
    }
    if (draggingConditionNodeId) {
      const { x: pointerX, y: pointerY } = toBoardCoords(event.clientX, event.clientY);
      if (!hasDraggedCondition) {
        const deltaX = Math.abs(pointerX - conditionDragStart.x);
        const deltaY = Math.abs(pointerY - conditionDragStart.y);
        if (deltaX > 3 || deltaY > 3) {
          setHasDraggedCondition(true);
        }
      }
      setConditionDragPosition({
        x: Math.max(PADDING / 2, pointerX - conditionDragOffset.x),
        y: Math.max(PADDING / 2, pointerY - conditionDragOffset.y),
      });
      return;
    }
    if (draggingBend) {
      const childPos = positionById[draggingBend.childId];
      const parentPos = positionById[draggingBend.parentId];
      if (!childPos || !parentPos) {
        return;
      }
      const { x: pointerX } = toBoardCoords(event.clientX, event.clientY);
      const startX = parentPos.x + NODE_WIDTH;
      const endX = childPos.x;
      setManualLinkBends((prev) => {
        const next = mergeLinkBendsForLink(
          prev,
          draggingBend.linkKey,
          startX,
          endX,
          pointerX
        );
        onLinkBendsChange?.(next);
        return next;
      });
      return;
    }
    if (isPanning && boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const nextX = event.clientX - rect.left - panStart.x;
      const nextY = event.clientY - rect.top - panStart.y;
      panRef.current = { x: nextX, y: nextY };
      setPan({ x: nextX, y: nextY });
      return;
    }
    if (!draggingId || !boardRef.current) {
      return;
    }
    const { x: pointerX, y: pointerY } = toBoardCoords(event.clientX, event.clientY);
    if (!hasDragged) {
      const deltaX = Math.abs(pointerX - dragStart.x);
      const deltaY = Math.abs(pointerY - dragStart.y);
      if (deltaX > 3 || deltaY > 3) {
        setHasDragged(true);
      }
    }

    let nextX = Math.max(PADDING / 2, pointerX - dragOffset.x);
    let nextY = Math.max(PADDING / 2, pointerY - dragOffset.y);
    let target: SnapTarget | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestAlignedX: number | null = null;
    let bestAlignedY: number | null = null;
    let bestAlignedXDistance = Number.POSITIVE_INFINITY;
    let bestAlignedYDistance = Number.POSITIVE_INFINITY;

    itemsWithId.forEach((item) => {
      if (item.id === draggingId) {
        return;
      }
      const targetPos = positionById[item.id];
      if (!targetPos) {
        return;
      }

      const dragAnchor = {
        x: nextX,
        y: nextY + NODE_HEIGHT / 2,
      };
      const targetAnchor = {
        x: targetPos.x + NODE_WIDTH,
        y: targetPos.y + NODE_HEIGHT / 2,
      };
      const distance = Math.hypot(
        dragAnchor.x - targetAnchor.x,
        dragAnchor.y - targetAnchor.y
      );
      if (distance <= SNAP_DISTANCE && distance < bestDistance) {
        bestDistance = distance;
        target = { targetId: item.id };
        nextX = targetPos.x + NODE_WIDTH + H_GAP;
        nextY = targetPos.y;
      }

      const deltaX = Math.abs(nextX - targetPos.x);
      if (deltaX <= ALIGN_SNAP_DISTANCE && deltaX < bestAlignedXDistance) {
        bestAlignedXDistance = deltaX;
        bestAlignedX = targetPos.x;
      }

      const deltaY = Math.abs(nextY - targetPos.y);
      if (deltaY <= ALIGN_SNAP_DISTANCE && deltaY < bestAlignedYDistance) {
        bestAlignedYDistance = deltaY;
        bestAlignedY = targetPos.y;
      }
    });

    if (!target) {
      if (bestAlignedX !== null) {
        nextX = bestAlignedX;
      }
      if (bestAlignedY !== null) {
        nextY = bestAlignedY;
      }
    }

    setSnapTarget(target);
    setDragPosition({ x: nextX, y: nextY });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (isMinimapDragging) {
      setIsMinimapDragging(false);
      return;
    }
    if (draggingBend) {
      setDraggingBend(null);
      return;
    }
    if (draggingConditionNodeId) {
      try {
        if (event.pointerId) {
          const target = event.target as HTMLElement;
          target.releasePointerCapture?.(event.pointerId);
        }
      } catch {
        // ignore
      }
      if (hasDraggedCondition && conditionDragPosition) {
        suppressClickRef.current = true;
        setManualConditionNodePositions((prev) => {
          const next = {
            ...prev,
            [draggingConditionNodeId]: conditionDragPosition,
          };
          onConditionNodePositionsChange?.(next);
          return next;
        });
      }
      setDraggingConditionNodeId(null);
      setConditionDragPosition(null);
      setHasDraggedCondition(false);
      return;
    }
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (!draggingId) {
      return;
    }
    try {
      if (event.pointerId) {
        const target = event.target as HTMLElement;
        target.releasePointerCapture?.(event.pointerId);
      }
    } catch {
      // ignore
    }

    const currentId = draggingId;
    const previousIds = incomingById[currentId] ?? [];
    const shiftSplit = splitRef.current;

    if (hasDragged) {
      suppressClickRef.current = true;
      if (shiftSplit) {
        previousIds.forEach((previousId) => onUnlink(currentId, previousId));
      } else if (snapTarget && snapTarget.targetId !== currentId) {
        if (!previousIds.includes(snapTarget.targetId)) {
          onLink(currentId, snapTarget.targetId);
        }
      } else if (dragPosition) {
        setManualPositions((prev) => {
          const next = {
            ...prev,
            [currentId]: dragPosition,
          };
          onPositionsChange?.(next);
          return next;
        });
      }
    }

    setDraggingId(null);
    setDragPosition(null);
    setSnapTarget(null);
    setHasDragged(false);
    splitRef.current = false;
  };

  const handleBoardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (
      target.closest(".rank-bar") ||
      target.closest(".rank-condition-node") ||
      target.closest(".rank-edge-hit") ||
      target.closest(".rank-edge-handle") ||
      target.closest(".rank-board__toolbar") ||
      target.closest(".rank-board__minimap")
    ) {
      return;
    }
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setIsPanning(true);
    setPanStart({
      x: event.clientX - rect.left - pan.x,
      y: event.clientY - rect.top - pan.y,
    });
    onSelect?.(null);
    onSelectLink?.(null);
  };

  const handleZoomStep = (delta: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.width / 2 : 0;
    const centerY = rect ? rect.height / 2 : 0;
    setZoomAtPointer(scaleRef.current + delta, centerX, centerY);
  };

  const handleResetView = () => {
    setScale(1);
    setPan(DEFAULT_PAN);
  };

  const handleFitView = () => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) {
      handleResetView();
      return;
    }
    const availableWidth = Math.max(1, rect.width - 40);
    const availableHeight = Math.max(1, rect.height - 40);
    const nextScale = clampScale(
      Math.min(availableWidth / worldBounds.width, availableHeight / worldBounds.height)
    );
    const nextPan = {
      x: (rect.width - worldBounds.width * nextScale) / 2 - worldBounds.minX * nextScale,
      y: (rect.height - worldBounds.height * nextScale) / 2 - worldBounds.minY * nextScale,
    };
    setScale(nextScale);
    setPan(nextPan);
  };

  const handleAutoLayout = () => {
    setManualPositions({});
    onPositionsChange?.({});
  };

  const handleSelect = (item: Rank & { id: string }) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSelectLink?.(null);
    onSelect?.(item);
  };

  const handleSelectLinkByIds = (currentId: string, previousId: string) => {
    const conditions = linkConditionsByKey[`${previousId}-${currentId}`] ?? [];
    onSelect?.(null);
    onSelectLink?.({ currentId, previousId, conditions });
  };

  const handleBendPointerDown = (event: PointerEvent<SVGCircleElement>, handle: LinkHandle) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingBend(handle);
    handleSelectLinkByIds(handle.childId, handle.parentId);
  };

  const handleConditionPointerDown = (
    event: PointerEvent<HTMLButtonElement>,
    node: ConditionNode
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x: pointerX, y: pointerY } = toBoardCoords(event.clientX, event.clientY);
    setConditionDragOffset({ x: pointerX - node.x, y: pointerY - node.y });
    setConditionDragStart({ x: pointerX, y: pointerY });
    setConditionDragPosition({ x: node.x, y: node.y });
    setHasDraggedCondition(false);
    setDraggingConditionNodeId(node.id);
    handleSelectLinkByIds(node.childId, node.parentId);
  };

  const handleMinimapPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();
    setIsMinimapDragging(true);
    moveViewportFromMinimap(event.clientX, event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMinimapPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setIsMinimapDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const toMinimapX = (x: number) =>
    minimapMetrics.originX + (x - worldBounds.minX) * minimapMetrics.scale;
  const toMinimapY = (y: number) =>
    minimapMetrics.originY + (y - worldBounds.minY) * minimapMetrics.scale;

  const canvasWidth = Math.max(autoLayout.width, worldBounds.maxX);
  const canvasHeight = Math.max(autoLayout.height, worldBounds.maxY);

  return (
    <div
      className={`rank-board${isPanning ? " rank-board--panning" : ""}`}
      ref={boardRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerDown={handleBoardPointerDown}
    >
      <div className="rank-board__toolbar">
        <div className="rank-board__toolbar-inner rank-board__toolbar-inner--tools">
          <button
            type="button"
            className="rank-board__tool-button"
            onClick={() => handleZoomStep(-0.15)}
            title={t("Zoom out")}
          >
            −
          </button>
          <span className="rank-board__zoom">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="rank-board__tool-button"
            onClick={() => handleZoomStep(0.15)}
            title={t("Zoom in")}
          >
            +
          </button>
          <button
            type="button"
            className="rank-board__tool-button"
            onClick={handleFitView}
            title={t("Fit view")}
          >
            {t("Fit")}
          </button>
          <button
            type="button"
            className="rank-board__tool-button"
            onClick={handleResetView}
            title={t("Reset view")}
          >
            {t("Reset")}
          </button>
          <button
            type="button"
            className="rank-board__tool-button"
            onClick={handleAutoLayout}
            title={t("Auto layout")}
          >
            {t("Auto")}
          </button>
        </div>
        {selectedItem && onColorChange && (
          <div className="rank-board__toolbar-inner">
            <span className="rank-board__toolbar-title">{selectedItem.name}</span>
            <span className="rank-board__toolbar-label">{t("Color")}</span>
            <input
              className="input rank-color-input"
              type="color"
              value={selectedItem.color || "#4b85b9"}
              onChange={(event) =>
                onColorChange(selectedItem.id, event.target.value)
              }
              disabled={isSavingColor}
            />
          </div>
        )}
      </div>

      <div
        className="rank-board__canvas"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
        }}
      >
        <svg className="rank-board__edges" width={canvasWidth} height={canvasHeight} aria-hidden="true">
          <defs>
            <marker
              id="rank-arrow"
              viewBox="0 0 10 10"
              refX="7.4"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>
          {edgeList.map((edge) => {
            const isActive =
              hoveredId && (edge.parentId === hoveredId || edge.childId === hoveredId);
            const isSelected = edge.linkKey === selectedLinkKey;
            return (
              <g key={edge.id}>
                <path
                  d={edge.path}
                  className={`rank-edge${
                    isActive ? " rank-edge--active" : ""
                  }${isSelected ? " rank-edge--selected" : ""}`}
                  markerEnd="url(#rank-arrow)"
                />
                <path
                  d={edge.path}
                  className="rank-edge-hit"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => handleSelectLinkByIds(edge.childId, edge.parentId)}
                  onDoubleClick={() => handleSelectLinkByIds(edge.childId, edge.parentId)}
                />
              </g>
            );
          })}
          {linkHandles.map((handle) => {
            const isSelected = handle.linkKey === selectedLinkKey;
            if (!isSelected) {
              return null;
            }
            return (
              <circle
                key={toHandleId(handle.linkKey)}
                cx={handle.x}
                cy={handle.y}
                r={6}
                className="rank-edge-handle"
                onPointerDown={(event) => handleBendPointerDown(event, handle)}
              />
            );
          })}
        </svg>

        {conditionNodes.map((node) => {
          const isSelected = node.linkKey === selectedLinkKey;
          return (
            <button
              key={node.id}
              type="button"
              className={`rank-condition-node${isSelected ? " rank-condition-node--selected" : ""}`}
              style={{
                width: node.width,
                height: node.height,
                transform: `translate(${node.x}px, ${node.y}px)`,
              }}
              title={node.condition.description || node.condition.name}
              onPointerDown={(event) => handleConditionPointerDown(event, node)}
              onClick={() => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                handleSelectLinkByIds(node.childId, node.parentId);
              }}
              onDoubleClick={() => handleSelectLinkByIds(node.childId, node.parentId)}
            >
              <span className="rank-condition-node__label">{node.condition.name}</span>
            </button>
          );
        })}

        {itemsWithId.map((item) => {
          const position = positionById[item.id] ?? {
            x: PADDING,
            y: PADDING,
          };
          const isSelected = item.id === selectedId;
          const isSnapTarget = item.id === snapTarget?.targetId;
          const classes = ["rank-bar"];
          if (isSelected) {
            classes.push("rank-bar--active");
          }
          if (isSnapTarget) {
            classes.push("rank-bar--snap");
          }
          const colorValue = item.color?.trim();
          const textColor = colorValue ? getContrastColor(colorValue) : undefined;
          const style = {
            width: NODE_WIDTH,
            transform: `translate(${position.x}px, ${position.y}px)`,
          } as CSSProperties & Record<string, string>;
          if (colorValue) {
            style["--rank-color" as string] = colorValue;
          }
          if (textColor) {
            style["--rank-text" as string] = textColor;
          }
          return (
            <button
              key={item.id}
              type="button"
              className={classes.join(" ")}
              style={style}
              onClick={() => handleSelect(item)}
              onPointerDown={(event) => handlePointerDown(event, item)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span className="rank-bar__label">{item.name}</span>
            </button>
          );
        })}
      </div>

      <div
        className="rank-board__minimap"
        ref={minimapRef}
        onPointerDown={handleMinimapPointerDown}
        onPointerMove={(event) => {
          if (isMinimapDragging) {
            moveViewportFromMinimap(event.clientX, event.clientY);
          }
        }}
        onPointerUp={handleMinimapPointerUp}
        onPointerCancel={handleMinimapPointerUp}
      >
        <span className="rank-board__minimap-title">{t("Mini map")}</span>
        <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} aria-hidden="true">
          <rect
            x={MINIMAP_PADDING}
            y={minimapMetrics.graphTop}
            width={MINIMAP_WIDTH - MINIMAP_PADDING * 2}
            height={minimapMetrics.graphBottom - minimapMetrics.graphTop}
            className="rank-board__minimap-graph-area"
          />
          <rect
            x={minimapMetrics.originX}
            y={minimapMetrics.originY}
            width={minimapMetrics.contentWidth}
            height={minimapMetrics.contentHeight}
            className="rank-board__minimap-content"
          />
          {edgeList.map((edge) => {
            const sourceNode = edge.id.endsWith("-out")
              ? conditionNodeByEdgeId.get(edge.id)
              : undefined;
            const targetNode = edge.id.endsWith("-in")
              ? conditionNodeByEdgeId.get(edge.id)
              : undefined;

            const childPos = positionById[edge.childId];
            const parentPos = positionById[edge.parentId];

            if (!childPos || !parentPos) {
              return null;
            }

            let x1 = toMinimapX(parentPos.x + NODE_WIDTH);
            let y1 = toMinimapY(parentPos.y + NODE_HEIGHT / 2);
            let x2 = toMinimapX(childPos.x);
            let y2 = toMinimapY(childPos.y + NODE_HEIGHT / 2);

            if (targetNode) {
              x2 = toMinimapX(targetNode.x);
              y2 = toMinimapY(targetNode.y + targetNode.height / 2);
            }
            if (sourceNode) {
              x1 = toMinimapX(sourceNode.x + sourceNode.width);
              y1 = toMinimapY(sourceNode.y + sourceNode.height / 2);
            }

            return (
              <line
                key={`map-${edge.id}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="rank-board__minimap-edge"
              />
            );
          })}
          {itemsWithId.map((item) => {
            const pos = positionById[item.id];
            if (!pos) {
              return null;
            }
            const x = toMinimapX(pos.x);
            const y = toMinimapY(pos.y);
            const width = Math.max(3, NODE_WIDTH * minimapMetrics.scale);
            const height = Math.max(3, NODE_HEIGHT * minimapMetrics.scale);
            const isSelected = item.id === selectedId;
            return (
              <rect
                key={`map-node-${item.id}`}
                x={x}
                y={y}
                width={width}
                height={height}
                rx={3}
                className={`rank-board__minimap-node${
                  isSelected ? " rank-board__minimap-node--selected" : ""
                }`}
              />
            );
          })}
          {conditionNodes.map((node) => {
            const isSelected = node.linkKey === selectedLinkKey;
            return (
              <rect
                key={`map-condition-${node.id}`}
                x={toMinimapX(node.x)}
                y={toMinimapY(node.y)}
                width={Math.max(2, node.width * minimapMetrics.scale)}
                height={Math.max(2, node.height * minimapMetrics.scale)}
                rx={2}
                className={`rank-board__minimap-condition-node${
                  isSelected ? " rank-board__minimap-condition-node--selected" : ""
                }`}
              />
            );
          })}
          <rect
            x={minimapViewportRect.x}
            y={minimapViewportRect.y}
            width={minimapViewportRect.width}
            height={minimapViewportRect.height}
            className="rank-board__minimap-viewport"
          />
        </svg>
      </div>
    </div>
  );
};
