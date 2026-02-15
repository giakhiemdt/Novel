import {
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BoardViewportControls } from "../../components/common/BoardViewportControls";
import { useBoardViewport } from "../../hooks/useBoardViewport";
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
const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MINIMAP_PADDING = 10;
const MINIMAP_HEADER_HEIGHT = 20;

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
  const [manualPositions, setManualPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const {
    scale,
    pan,
    isPanning,
    viewportSize,
    zoomBy,
    startPan,
    movePan,
    stopPan,
    resetView,
    fitToRect,
    centerOnWorldPoint,
    toWorldCoords,
  } = useBoardViewport({
    boardRef,
    minScale: MIN_SCALE,
    maxScale: MAX_SCALE,
    defaultPan: DEFAULT_PAN,
    wheelZoomFactor: 0.0012,
    consumeWheel: true,
  });

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

  const fitToBoard = () => {
    fitToRect({ x: 0, y: 0, width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT }, 36);
  };

  useEffect(() => {
    if (items.length === 0) {
      return;
    }
    fitToBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, viewportSize.width, viewportSize.height]);

  const handleBoardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const target = event.target as HTMLElement;
    if (
      target.closest(".graph-board-toolbar") ||
      target.closest(".graph-board-minimap") ||
      target.closest(".relationship-graph__node-handle")
    ) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    startPan(event.clientX, event.clientY);
  };

  const handleBoardPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingNodeId) {
      const { x: worldX, y: worldY } = toWorldCoords(event.clientX, event.clientY);
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

    movePan(event.clientX, event.clientY);
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
    stopPan();
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const minimapBounds = useMemo(() => {
    const innerWidth = MINIMAP_WIDTH - MINIMAP_PADDING * 2;
    const innerHeight = MINIMAP_HEIGHT - MINIMAP_HEADER_HEIGHT - MINIMAP_PADDING;
    return {
      innerWidth,
      innerHeight,
      scale: Math.min(innerWidth / VIEWBOX_WIDTH, innerHeight / VIEWBOX_HEIGHT),
    };
  }, []);

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
        <BoardViewportControls
          zoom={scale}
          onZoomOut={() => zoomBy(-0.15)}
          onZoomIn={() => zoomBy(0.15)}
          onFit={fitToBoard}
          onReset={resetView}
          minimapTitle={t("Mini map")}
          minimap={(
            <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} role="img" aria-label={t("Mini map")}
              onPointerDown={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const localX = event.clientX - rect.left;
                const localY = event.clientY - rect.top - MINIMAP_HEADER_HEIGHT;
                const worldX = (localX - MINIMAP_PADDING) / minimapBounds.scale;
                const worldY = (localY - MINIMAP_PADDING) / minimapBounds.scale;
                centerOnWorldPoint(worldX, worldY);
              }}
            >
              <rect
                x={MINIMAP_PADDING}
                y={MINIMAP_HEADER_HEIGHT}
                width={minimapBounds.innerWidth}
                height={minimapBounds.innerHeight}
                className="graph-board-minimap__frame"
              />

              {bundledEdges.map((edge) => {
                const from = layout[edge.a];
                const to = layout[edge.b];
                if (!from || !to) {
                  return null;
                }
                return (
                  <line
                    key={`mini-edge-${edge.key}`}
                    x1={MINIMAP_PADDING + from.x * minimapBounds.scale}
                    y1={MINIMAP_HEADER_HEIGHT + MINIMAP_PADDING + from.y * minimapBounds.scale}
                    x2={MINIMAP_PADDING + to.x * minimapBounds.scale}
                    y2={MINIMAP_HEADER_HEIGHT + MINIMAP_PADDING + to.y * minimapBounds.scale}
                    className="graph-board-minimap__edge"
                  />
                );
              })}

              {nodeIds.map((id) => {
                const node = layout[id];
                if (!node) {
                  return null;
                }
                return (
                  <circle
                    key={`mini-node-${id}`}
                    cx={MINIMAP_PADDING + node.x * minimapBounds.scale}
                    cy={MINIMAP_HEADER_HEIGHT + MINIMAP_PADDING + node.y * minimapBounds.scale}
                    r={Math.max(2, NODE_RADIUS * minimapBounds.scale * 0.68)}
                    className="graph-board-minimap__node"
                  />
                );
              })}

              {viewportWorld ? (
                <rect
                  x={MINIMAP_PADDING + viewportWorld.x * minimapBounds.scale}
                  y={MINIMAP_HEADER_HEIGHT + MINIMAP_PADDING + viewportWorld.y * minimapBounds.scale}
                  width={viewportWorld.width * minimapBounds.scale}
                  height={viewportWorld.height * minimapBounds.scale}
                  className="graph-board-minimap__viewport"
                />
              ) : null}
            </svg>
          )}
        />

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
              const edgeLabelPathId = `${edgePathId}-label`;
              const pathValue = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
              const isReadableForward =
                startX < endX || (Math.abs(startX - endX) < 0.5 && startY <= endY);
              const labelPathValue = isReadableForward
                ? pathValue
                : `M ${endX} ${endY} Q ${controlX} ${controlY} ${startX} ${startY}`;

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
                  <path id={edgeLabelPathId} d={labelPathValue} fill="none" stroke="none" />
                  <text className="relationship-graph__edge-label">
                    <textPath
                      href={`#${edgeLabelPathId}`}
                      startOffset="50%"
                      textAnchor="middle"
                      dy="-5"
                    >
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
                    const { x: worldX, y: worldY } = toWorldCoords(
                      event.clientX,
                      event.clientY
                    );
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
