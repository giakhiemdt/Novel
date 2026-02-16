import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { BoardViewportControls } from "../../components/common/BoardViewportControls";
import { useBoardViewport } from "../../hooks/useBoardViewport";
import { useI18n } from "../../i18n/I18nProvider";
import type { EnergyTier, EnergyTierLink } from "./energy-tier.types";

type EnergyTierBoardProps = {
  items: EnergyTier[];
  links: EnergyTierLink[];
  positions?: Record<string, { x: number; y: number }>;
  onPositionsChange?: (positions: Record<string, { x: number; y: number }>) => void;
};

type GraphNode = {
  id: string;
  label: string;
  color?: string;
  x: number;
  y: number;
};

type GraphEdge = {
  id: string;
  previousId: string;
  currentId: string;
  label: string;
};

const VIEWBOX_WIDTH = 1800;
const VIEWBOX_HEIGHT = 1200;
const NODE_WIDTH = 170;
const NODE_HEIGHT = 44;
const NODE_RADIUS = 20;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.4;
const DEFAULT_PAN = { x: 20, y: 20 };
const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MINIMAP_PADDING = 10;
const MINIMAP_HEADER_HEIGHT = 20;

const buildLayout = (items: EnergyTier[]): Record<string, GraphNode> => {
  const grouped = new Map<string, EnergyTier[]>();
  items.forEach((item) => {
    const key = item.energyTypeId || "__unknown__";
    const list = grouped.get(key) ?? [];
    list.push(item);
    grouped.set(key, list);
  });

  const sortedGroups = Array.from(grouped.entries()).sort((a, b) => {
    const aName = a[1][0]?.energyTypeName ?? "";
    const bName = b[1][0]?.energyTypeName ?? "";
    return aName.localeCompare(bName);
  });

  const result: Record<string, GraphNode> = {};
  sortedGroups.forEach(([_, group], groupIndex) => {
    const sorted = [...group].sort((a, b) => {
      const la = a.level ?? Number.MAX_SAFE_INTEGER;
      const lb = b.level ?? Number.MAX_SAFE_INTEGER;
      if (la !== lb) {
        return la - lb;
      }
      return a.name.localeCompare(b.name);
    });
    sorted.forEach((item, rowIndex) => {
      result[item.id] = {
        id: item.id,
        label: item.name,
        color: item.color,
        x: 140 + groupIndex * 300,
        y: 110 + rowIndex * 120,
      };
    });
  });

  return result;
};

const getLabel = (edge: EnergyTierLink) => {
  const parts: string[] = [];
  if (edge.requiredAmount !== undefined) {
    parts.push(`req ${edge.requiredAmount}`);
  }
  if (edge.efficiency !== undefined) {
    parts.push(`eff ${edge.efficiency}`);
  }
  if (edge.condition) {
    parts.push(edge.condition);
  }
  return parts.join(" • ");
};

export const EnergyTierBoard = ({
  items,
  links,
  positions,
  onPositionsChange,
}: EnergyTierBoardProps) => {
  const { t } = useI18n();
  const boardRef = useRef<HTMLDivElement>(null);
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>(
    positions ?? {}
  );
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

  useEffect(() => {
    setManualPositions(positions ?? {});
  }, [positions]);

  const autoLayout = useMemo(() => buildLayout(items), [items]);

  const nodeMap = useMemo(() => {
    const next = { ...autoLayout };
    Object.entries(manualPositions).forEach(([id, pos]) => {
      if (next[id]) {
        next[id] = { ...next[id], x: pos.x, y: pos.y };
      }
    });
    return next;
  }, [autoLayout, manualPositions]);

  const edgeList = useMemo<GraphEdge[]>(
    () =>
      links
        .filter((link) => nodeMap[link.previousId] && nodeMap[link.currentId])
        .map((link) => ({
          id: `${link.previousId}-${link.currentId}`,
          previousId: link.previousId,
          currentId: link.currentId,
          label: getLabel(link),
        })),
    [links, nodeMap]
  );

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
      target.closest(".energy-tier-board__node-handle")
    ) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    startPan(event.clientX, event.clientY);
  };

  const handleBoardPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingNodeId) {
      const { x: worldX, y: worldY } = toWorldCoords(event.clientX, event.clientY);
      const nextX = worldX - dragOffset.x;
      const nextY = worldY - dragOffset.y;
      setManualPositions((prev) => {
        const next = {
          ...prev,
          [draggingNodeId]: { x: nextX, y: nextY },
        };
        onPositionsChange?.(next);
        return next;
      });
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

  if (items.length === 0) {
    return <p className="header__subtitle">{t("No energy tiers to render as graph.")}</p>;
  }

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
            <svg
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              role="img"
              aria-label={t("Mini map")}
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

              {edgeList.map((edge) => {
                const from = nodeMap[edge.previousId];
                const to = nodeMap[edge.currentId];
                if (!from || !to) {
                  return null;
                }
                const startX = from.x + NODE_WIDTH / 2;
                const startY = from.y + NODE_HEIGHT / 2;
                const endX = to.x + NODE_WIDTH / 2;
                const endY = to.y + NODE_HEIGHT / 2;

                return (
                  <line
                    key={`mini-edge-${edge.id}`}
                    x1={MINIMAP_PADDING + startX * minimapBounds.scale}
                    y1={MINIMAP_HEADER_HEIGHT + MINIMAP_PADDING + startY * minimapBounds.scale}
                    x2={MINIMAP_PADDING + endX * minimapBounds.scale}
                    y2={MINIMAP_HEADER_HEIGHT + MINIMAP_PADDING + endY * minimapBounds.scale}
                    className="graph-board-minimap__edge"
                  />
                );
              })}

              {Object.values(nodeMap).map((node) => (
                <rect
                  key={`mini-node-${node.id}`}
                  x={MINIMAP_PADDING + node.x * minimapBounds.scale}
                  y={MINIMAP_HEADER_HEIGHT + MINIMAP_PADDING + node.y * minimapBounds.scale}
                  width={Math.max(3, NODE_WIDTH * minimapBounds.scale)}
                  height={Math.max(3, NODE_HEIGHT * minimapBounds.scale)}
                  rx={Math.max(1, NODE_RADIUS * minimapBounds.scale)}
                  className="graph-board-minimap__node"
                />
              ))}

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
            aria-label={t("Energy tier graph")}
          >
            <defs>
              <marker
                id="energy-tier-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
              </marker>
            </defs>

            {edgeList.map((edge) => {
              const from = nodeMap[edge.previousId];
              const to = nodeMap[edge.currentId];
              if (!from || !to) {
                return null;
              }
              const startX = from.x + NODE_WIDTH;
              const startY = from.y + NODE_HEIGHT / 2;
              const endX = to.x;
              const endY = to.y + NODE_HEIGHT / 2;
              const midX = (startX + endX) / 2;
              const pathId = `energy-tier-edge-${edge.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
              const pathValue = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

              return (
                <g key={edge.id}>
                  <path
                    id={pathId}
                    d={pathValue}
                    className="relationship-graph__edge"
                    style={{ color: "#6B7280" }}
                    markerEnd="url(#energy-tier-arrow)"
                  />
                  {edge.label ? (
                    <text className="relationship-graph__edge-label">
                      <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle" dy="-6">
                        {edge.label}
                      </textPath>
                    </text>
                  ) : null}
                </g>
              );
            })}

            {Object.values(nodeMap).map((node) => (
              <g
                key={node.id}
                className="energy-tier-board__node-handle"
                onPointerDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }
                  event.stopPropagation();
                  const { x: worldX, y: worldY } = toWorldCoords(event.clientX, event.clientY);
                  setDraggingNodeId(node.id);
                  setDragOffset({ x: worldX - node.x, y: worldY - node.y });
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              >
                <rect
                  x={node.x}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={NODE_RADIUS}
                  className="energy-tier-board__node"
                  style={{
                    fill: `${node.color ?? "#CBD5E1"}33`,
                    stroke: node.color ?? "#94A3B8",
                  }}
                />
                <text
                  x={node.x + NODE_WIDTH / 2}
                  y={node.y + NODE_HEIGHT / 2}
                  className="energy-tier-board__label"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {node.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};
