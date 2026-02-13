import {
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { CharacterRelation } from "./relationship.types";

type GraphNode = {
  id: string;
  label: string;
  x: number;
  y: number;
};

type BundledEdge = {
  key: string;
  a: string;
  b: string;
  hasAToB: boolean;
  hasBToA: boolean;
  types: string[];
};

export type RelationshipGraphProps = {
  items: CharacterRelation[];
  charactersById?: Record<string, string>;
  relationshipTypesByCode?: Record<string, { name: string; color?: string }>;
};

const VIEWBOX_WIDTH = 1100;
const VIEWBOX_HEIGHT = 640;
const NODE_RADIUS = 22;
const MIN_SCALE = 0.45;
const MAX_SCALE = 2.4;
const DEFAULT_PAN = { x: 20, y: 20 };

const palette = [
  "#2563EB",
  "#DC2626",
  "#059669",
  "#D97706",
  "#7C3AED",
  "#DB2777",
  "#0F766E",
  "#4B5563",
];

const buildLayout = (
  nodeIds: string[],
  labels: Record<string, string>
): Record<string, GraphNode> => {
  const count = nodeIds.length;
  const cx = VIEWBOX_WIDTH / 2;
  const cy = VIEWBOX_HEIGHT / 2;
  const radius = Math.max(140, Math.min(250, 90 + count * 11));

  return nodeIds.reduce<Record<string, GraphNode>>((acc, id, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(count, 1) - Math.PI / 2;
    acc[id] = {
      id,
      label: labels[id] ?? id,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
    return acc;
  }, {});
};

const getEdgeColor = (
  type: string,
  index: number,
  relationshipTypesByCode?: Record<string, { name: string; color?: string }>
): string => {
  const configured = relationshipTypesByCode?.[type]?.color;
  if (configured) {
    return configured;
  }
  return palette[index % palette.length];
};

const clampScale = (value: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const RelationshipGraph = ({
  items,
  charactersById,
  relationshipTypesByCode,
}: RelationshipGraphProps) => {
  const { t } = useI18n();
  const boardRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const panRef = useRef(DEFAULT_PAN);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState(DEFAULT_PAN);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [manualPositions, setManualPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const nodeIds = useMemo(() => {
    const unique = new Set<string>();
    items.forEach((item) => {
      if (item.fromId) {
        unique.add(item.fromId);
      }
      if (item.toId) {
        unique.add(item.toId);
      }
    });
    return Array.from(unique).sort((a, b) => {
      const aLabel = charactersById?.[a] ?? a;
      const bLabel = charactersById?.[b] ?? b;
      return aLabel.localeCompare(bLabel);
    });
  }, [items, charactersById]);

  const labels = useMemo(() => {
    return nodeIds.reduce<Record<string, string>>((acc, id) => {
      acc[id] = charactersById?.[id] ?? id;
      return acc;
    }, {});
  }, [nodeIds, charactersById]);

  const autoLayout = useMemo(() => buildLayout(nodeIds, labels), [nodeIds, labels]);

  const layout = useMemo(() => {
    const next = { ...autoLayout };
    Object.entries(manualPositions).forEach(([id, pos]) => {
      if (next[id]) {
        next[id] = { ...next[id], x: pos.x, y: pos.y };
      }
    });
    return next;
  }, [autoLayout, manualPositions]);

  const legend = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ code: string; label: string; color: string }> = [];

    items.forEach((item, index) => {
      if (seen.has(item.type)) {
        return;
      }
      seen.add(item.type);
      result.push({
        code: item.type,
        label: relationshipTypesByCode?.[item.type]?.name ?? item.type,
        color: getEdgeColor(item.type, index, relationshipTypesByCode),
      });
    });

    return result;
  }, [items, relationshipTypesByCode]);

  const bundledEdges = useMemo<BundledEdge[]>(() => {
    const grouped = new Map<string, BundledEdge>();

    items.forEach((item) => {
      if (!item.fromId || !item.toId || item.fromId === item.toId) {
        return;
      }
      const [a, b] = item.fromId < item.toId
        ? [item.fromId, item.toId]
        : [item.toId, item.fromId];
      const key = `${a}|${b}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          key,
          a,
          b,
          hasAToB: item.fromId === a,
          hasBToA: item.fromId === b,
          types: [item.type],
        });
        return;
      }
      if (item.fromId === a) {
        existing.hasAToB = true;
      } else {
        existing.hasBToA = true;
      }
      if (!existing.types.includes(item.type)) {
        existing.types.push(item.type);
      }
    });

    return Array.from(grouped.values()).sort((x, y) => {
      const xName = `${labels[x.a] ?? x.a} ${labels[x.b] ?? x.b}`;
      const yName = `${labels[y.a] ?? y.a} ${labels[y.b] ?? y.b}`;
      return xName.localeCompare(yName);
    });
  }, [items, labels]);

  useEffect(() => {
    const valid = new Set(nodeIds);
    setManualPositions((prev) => {
      let changed = false;
      const next: Record<string, { x: number; y: number }> = {};
      Object.entries(prev).forEach(([id, pos]) => {
        if (valid.has(id)) {
          next[id] = pos;
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [nodeIds]);

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
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const fitToBoard = () => {
    const node = boardRef.current;
    if (!node) {
      return;
    }
    const padding = 36;
    const targetScale = clampScale(
      Math.min(
        (node.clientWidth - padding * 2) / VIEWBOX_WIDTH,
        (node.clientHeight - padding * 2) / VIEWBOX_HEIGHT
      )
    );
    const centeredPan = {
      x: (node.clientWidth - VIEWBOX_WIDTH * targetScale) / 2,
      y: (node.clientHeight - VIEWBOX_HEIGHT * targetScale) / 2,
    };
    setScale(targetScale);
    setPan(centeredPan);
  };

  useEffect(() => {
    if (items.length === 0) {
      return;
    }
    fitToBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, viewportSize.width, viewportSize.height]);

  const setZoomAtPointer = (
    nextScale: number,
    pointerX: number,
    pointerY: number
  ) => {
    const currentScale = scaleRef.current;
    const currentPan = panRef.current;
    const clamped = clampScale(nextScale);
    if (clamped === currentScale) {
      return;
    }
    const ratio = clamped / currentScale;
    const nextPanX = pointerX - (pointerX - currentPan.x) * ratio;
    const nextPanY = pointerY - (pointerY - currentPan.y) * ratio;
    scaleRef.current = clamped;
    panRef.current = { x: nextPanX, y: nextPanY };
    setScale(clamped);
    setPan({ x: nextPanX, y: nextPanY });
  };

  useEffect(() => {
    const node = boardRef.current;
    if (!node) {
      return;
    }
    const onWheelNative = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = node.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const nextScale = scaleRef.current - event.deltaY * 0.0012;
      setZoomAtPointer(nextScale, pointerX, pointerY);
    };
    node.addEventListener("wheel", onWheelNative, { passive: false });
    return () => node.removeEventListener("wheel", onWheelNative);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBoardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const target = event.target as HTMLElement;
    if (
      target.closest(".relationship-graph__toolbar") ||
      target.closest(".relationship-graph__node-handle")
    ) {
      return;
    }
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
    setPanStart({
      x: event.clientX - rect.left - pan.x,
      y: event.clientY - rect.top - pan.y,
    });
  };

  const handleBoardPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    if (draggingNodeId) {
      const worldX = (event.clientX - rect.left - pan.x) / scale;
      const worldY = (event.clientY - rect.top - pan.y) / scale;
      const minBound = NODE_RADIUS + 6;
      const maxX = VIEWBOX_WIDTH - NODE_RADIUS - 6;
      const maxY = VIEWBOX_HEIGHT - NODE_RADIUS - 6;
      const nextX = Math.max(minBound, Math.min(maxX, worldX - dragOffset.x));
      const nextY = Math.max(minBound, Math.min(maxY, worldY - dragOffset.y));
      setManualPositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: nextX, y: nextY },
      }));
      return;
    }

    if (!isPanning) {
      return;
    }
    setPan({
      x: event.clientX - rect.left - panStart.x,
      y: event.clientY - rect.top - panStart.y,
    });
  };

  const handleBoardPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingNodeId) {
      setDraggingNodeId(null);
      event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }
    if (!isPanning) {
      return;
    }
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (items.length === 0 || nodeIds.length === 0) {
    return <p className="header__subtitle">{t("No relationships to render as graph.")}</p>;
  }

  const shortenLabel = (value: string): string =>
    value.length > 12 ? `${value.slice(0, 11)}…` : value;

  return (
    <div className="relationship-graph">
      <div
        className={`relationship-graph__board${isPanning ? " relationship-graph__board--panning" : ""}`}
        ref={boardRef}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerLeave={handleBoardPointerUp}
      >
        <div className="relationship-graph__toolbar">
          <button
            type="button"
            className="relationship-graph__tool"
            onClick={() => setScale((prev) => clampScale(prev - 0.15))}
            title={t("Zoom out")}
          >
            -
          </button>
          <span className="relationship-graph__zoom">{Math.round(scale * 100)}%</span>
          <button
            type="button"
            className="relationship-graph__tool"
            onClick={() => setScale((prev) => clampScale(prev + 0.15))}
            title={t("Zoom in")}
          >
            +
          </button>
          <button
            type="button"
            className="relationship-graph__tool"
            onClick={fitToBoard}
            title={t("Fit view")}
          >
            {t("Fit")}
          </button>
          <button
            type="button"
            className="relationship-graph__tool"
            onClick={() => {
              setScale(1);
              setPan(DEFAULT_PAN);
            }}
            title={t("Reset view")}
          >
            {t("Reset")}
          </button>
        </div>

        <div
          className="relationship-graph__surface"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
          }}
        >
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
            className="relationship-graph__svg"
            role="img"
            aria-label={t("Character relationship graph")}
          >
            <defs>
              <marker
                id="relationship-graph-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>

            {bundledEdges.map((edge, index) => {
              const from = layout[edge.a];
              const to = layout[edge.b];
              if (!from || !to) {
                return null;
              }

              const color = edge.types.length === 1
                ? getEdgeColor(edge.types[0] ?? "", index, relationshipTypesByCode)
                : "#6B7280";
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const distance = Math.hypot(dx, dy) || 1;
              const offsetX = (dx / distance) * NODE_RADIUS;
              const offsetY = (dy / distance) * NODE_RADIUS;
              const startX = from.x + offsetX;
              const startY = from.y + offsetY;
              const endX = to.x - offsetX;
              const endY = to.y - offsetY;
              const lane = (hashString(edge.key) % 5) - 2;
              const curvature = 18 + lane * 10;
              const controlX = (startX + endX) / 2 - (dy / distance) * curvature;
              const controlY = (startY + endY) / 2 + (dx / distance) * curvature;
              const typeLabels = edge.types.map(
                (type) => relationshipTypesByCode?.[type]?.name ?? type
              );
              const label = typeLabels.length <= 2
                ? typeLabels.join(" • ")
                : `${typeLabels.length} relations`;
              const edgePathId = `relationship-edge-${edge.key}-${index}`
                .replace(/[^a-zA-Z0-9_-]/g, "-");
              const pathValue = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;

              return (
                <g key={edge.key}>
                  <path
                    id={edgePathId}
                    d={pathValue}
                    className="relationship-graph__edge"
                    style={{ color }}
                    markerStart={edge.hasBToA ? "url(#relationship-graph-arrow)" : undefined}
                    markerEnd={edge.hasAToB ? "url(#relationship-graph-arrow)" : undefined}
                  />
                  <text className="relationship-graph__edge-label">
                    <textPath href={`#${edgePathId}`} startOffset="50%" textAnchor="middle">
                      {label}
                    </textPath>
                  </text>
                </g>
              );
            })}

            {nodeIds.map((id) => {
              const node = layout[id];
              if (!node) {
                return null;
              }

              return (
                <g
                  key={id}
                  className="relationship-graph__node-handle"
                  onPointerDown={(event) => {
                    if (event.button !== 0) {
                      return;
                    }
                    event.stopPropagation();
                    const rect = boardRef.current?.getBoundingClientRect();
                    if (!rect) {
                      return;
                    }
                    const worldX = (event.clientX - rect.left - pan.x) / scale;
                    const worldY = (event.clientY - rect.top - pan.y) / scale;
                    setDraggingNodeId(id);
                    setDragOffset({ x: worldX - node.x, y: worldY - node.y });
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS}
                    className="relationship-graph__node"
                  />
                  <text
                    x={node.x}
                    y={node.y}
                    className="relationship-graph__label"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {shortenLabel(node.label)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="relationship-graph__legend">
        {legend.map((item) => (
          <span key={item.code} className="relationship-graph__legend-item">
            <span
              className="relationship-graph__legend-swatch"
              style={{ background: item.color }}
              aria-hidden="true"
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};
