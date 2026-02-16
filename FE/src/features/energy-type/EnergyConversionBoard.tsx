import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { BoardViewportControls } from "../../components/common/BoardViewportControls";
import { useBoardViewport } from "../../hooks/useBoardViewport";
import { useI18n } from "../../i18n/I18nProvider";
import type { EnergyConversion, EnergyType } from "./energy-type.types";

type EnergyConversionBoardProps = {
  items: EnergyType[];
  conversions: EnergyConversion[];
  positions?: Record<string, { x: number; y: number }>;
  selectedLink?: { fromId: string; toId: string } | null;
  linkDraftFromId?: string | null;
  onPositionsChange?: (positions: Record<string, { x: number; y: number }>) => void;
  onNodeClick?: (id: string) => void;
  onEdgeClick?: (fromId: string, toId: string) => void;
  onClearSelection?: () => void;
};

type GraphNode = {
  id: string;
  label: string;
  code: string;
  color: string;
  x: number;
  y: number;
};

type GraphEdge = {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  isActive: boolean;
};

const NODE_WIDTH = 184;
const NODE_HEIGHT = 56;
const VIEWBOX_WIDTH = 2400;
const VIEWBOX_HEIGHT = 1600;
const MIN_SCALE = 0.4;
const MAX_SCALE = 2.4;
const DEFAULT_PAN = { x: 20, y: 20 };
const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MINIMAP_PADDING = 10;
const MINIMAP_HEADER_HEIGHT = 20;

const getEdgeLabel = (item: EnergyConversion): string => {
  const parts: string[] = [];
  if (item.ratio !== undefined) {
    parts.push(`ratio ${item.ratio}`);
  }
  if (item.lossRate !== undefined) {
    parts.push(`loss ${item.lossRate}`);
  }
  if (item.condition) {
    parts.push(item.condition);
  }
  return parts.join(" • ");
};

const buildLayout = (items: EnergyType[]): Record<string, GraphNode> => {
  const sorted = [...items]
    .filter((item) => Boolean(item.id))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  const columnCount = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, sorted.length))));

  const next: Record<string, GraphNode> = {};
  sorted.forEach((item, index) => {
    const col = index % columnCount;
    const row = Math.floor(index / columnCount);
    next[item.id] = {
      id: item.id,
      label: item.name,
      code: item.code,
      color: item.color?.trim() || "#64748B",
      x: 120 + col * 280,
      y: 100 + row * 170,
    };
  });

  return next;
};

const sanitizeManualPositions = (
  value: Record<string, { x: number; y: number }> | undefined
) => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const next: Record<string, { x: number; y: number }> = {};
  Object.entries(value).forEach(([id, pos]) => {
    if (
      pos &&
      typeof pos === "object" &&
      Number.isFinite(pos.x) &&
      Number.isFinite(pos.y)
    ) {
      next[id] = { x: pos.x, y: pos.y };
    }
  });
  return next;
};

type EdgeGeometry = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  labelX: number;
  labelY: number;
};

const getEdgeGeometry = (from: GraphNode, to: GraphNode): EdgeGeometry => {
  const fromCenterX = from.x + NODE_WIDTH / 2;
  const fromCenterY = from.y + NODE_HEIGHT / 2;
  const toCenterX = to.x + NODE_WIDTH / 2;
  const toCenterY = to.y + NODE_HEIGHT / 2;
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  if (dx === 0 && dy === 0) {
    return {
      startX: fromCenterX,
      startY: fromCenterY,
      endX: toCenterX,
      endY: toCenterY,
      labelX: fromCenterX,
      labelY: fromCenterY,
    };
  }

  const fromHalfWidth = NODE_WIDTH / 2;
  const fromHalfHeight = NODE_HEIGHT / 2;
  const toHalfWidth = NODE_WIDTH / 2;
  const toHalfHeight = NODE_HEIGHT / 2;

  const fromScale =
    Math.abs(dx) * fromHalfHeight > Math.abs(dy) * fromHalfWidth
      ? fromHalfWidth / Math.abs(dx || 1)
      : fromHalfHeight / Math.abs(dy || 1);
  const toScale =
    Math.abs(dx) * toHalfHeight > Math.abs(dy) * toHalfWidth
      ? toHalfWidth / Math.abs(dx || 1)
      : toHalfHeight / Math.abs(dy || 1);

  const startX = fromCenterX + dx * fromScale;
  const startY = fromCenterY + dy * fromScale;
  const endX = toCenterX - dx * toScale;
  const endY = toCenterY - dy * toScale;

  return {
    startX,
    startY,
    endX,
    endY,
    labelX: startX + (endX - startX) / 2,
    labelY: startY + (endY - startY) / 2,
  };
};

export const EnergyConversionBoard = ({
  items,
  conversions,
  positions,
  selectedLink,
  linkDraftFromId,
  onPositionsChange,
  onNodeClick,
  onEdgeClick,
  onClearSelection,
}: EnergyConversionBoardProps) => {
  const { t } = useI18n();
  const boardRef = useRef<HTMLDivElement>(null);
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>(
    positions ?? {}
  );
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const suppressClickRef = useRef(false);

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
    setManualPositions(sanitizeManualPositions(positions));
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
      conversions
        .filter((item) => nodeMap[item.fromId] && nodeMap[item.toId])
        .map((item) => ({
          id: `${item.fromId}-${item.toId}`,
          fromId: item.fromId,
          toId: item.toId,
          label: getEdgeLabel(item),
          isActive: item.isActive,
        })),
    [conversions, nodeMap]
  );

  const fitToBoard = () => {
    const nodes = Object.values(nodeMap);
    if (nodes.length === 0) {
      fitToRect({ x: 0, y: 0, width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT }, 30);
      return;
    }

    const minX = Math.min(...nodes.map((node) => node.x));
    const minY = Math.min(...nodes.map((node) => node.y));
    const maxX = Math.max(...nodes.map((node) => node.x + NODE_WIDTH));
    const maxY = Math.max(...nodes.map((node) => node.y + NODE_HEIGHT));

    fitToRect(
      {
        x: minX - 120,
        y: minY - 120,
        width: Math.max(320, maxX - minX + 240),
        height: Math.max(260, maxY - minY + 240),
      },
      30
    );
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
      target.closest(".energy-conversion-board__node-handle")
    ) {
      return;
    }
    onClearSelection?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    startPan(event.clientX, event.clientY);
  };

  const handleBoardPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draggingNodeId) {
      const { x: worldX, y: worldY } = toWorldCoords(event.clientX, event.clientY);
      const nextX = worldX - dragOffset.x;
      const nextY = worldY - dragOffset.y;

      suppressClickRef.current = true;
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
    return <p className="header__subtitle">{t("No energy types to render as conversion board.")}</p>;
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
                const from = nodeMap[edge.fromId];
                const to = nodeMap[edge.toId];
                if (!from || !to) {
                  return null;
                }
                const { startX, startY, endX, endY } = getEdgeGeometry(from, to);
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
                  rx={4}
                  className="graph-board-minimap__node"
                />
              ))}

              {viewportWorld ? (
                <rect
                  x={MINIMAP_PADDING + viewportWorld.x * minimapBounds.scale}
                  y={MINIMAP_HEADER_HEIGHT + MINIMAP_PADDING + viewportWorld.y * minimapBounds.scale}
                  width={Math.max(6, viewportWorld.width * minimapBounds.scale)}
                  height={Math.max(6, viewportWorld.height * minimapBounds.scale)}
                  className="graph-board-minimap__viewport"
                />
              ) : null}
            </svg>
          )}
        />

        <div
          className="relationship-graph__surface"
          style={{
            width: VIEWBOX_WIDTH,
            height: VIEWBOX_HEIGHT,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          }}
        >
          <svg
            className="relationship-graph__svg energy-conversion-board__svg"
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
          >
            <defs>
              <marker
                id="energy-conversion-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" className="energy-conversion-board__arrow" />
              </marker>
            </defs>

            {edgeList.map((edge) => {
              const from = nodeMap[edge.fromId];
              const to = nodeMap[edge.toId];
              if (!from || !to) {
                return null;
              }

              const { startX, startY, endX, endY, labelX, labelY } = getEdgeGeometry(
                from,
                to
              );
              const isSelected =
                selectedLink?.fromId === edge.fromId && selectedLink?.toId === edge.toId;

              return (
                <g key={edge.id}>
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    className={`energy-conversion-board__edge-hit${isSelected ? " energy-conversion-board__edge-hit--selected" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdgeClick?.(edge.fromId, edge.toId);
                    }}
                  />
                  <line
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    className={`energy-conversion-board__edge${!edge.isActive ? " energy-conversion-board__edge--inactive" : ""}${isSelected ? " energy-conversion-board__edge--selected" : ""}`}
                    markerEnd="url(#energy-conversion-arrow)"
                  />
                  {edge.label ? (
                    <text
                      x={labelX}
                      y={labelY - 8}
                      textAnchor="middle"
                      className="relationship-graph__edge-label"
                    >
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {Object.values(nodeMap).map((node) => {
              const isDraftSource = linkDraftFromId === node.id;
              const width = NODE_WIDTH;
              const height = NODE_HEIGHT;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="energy-conversion-board__node-handle"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    const { x: worldX, y: worldY } = toWorldCoords(event.clientX, event.clientY);
                    setDraggingNodeId(node.id);
                    setDragOffset({ x: worldX - node.x, y: worldY - node.y });
                    suppressClickRef.current = false;
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    onNodeClick?.(node.id);
                  }}
                >
                  <rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    rx={14}
                    className={`energy-conversion-board__node${isDraftSource ? " energy-conversion-board__node--draft" : ""}`}
                    style={{
                      fill: `${node.color}22`,
                      stroke: node.color,
                    }}
                  />
                  <text x={12} y={24} className="energy-conversion-board__label">
                    {node.label}
                  </text>
                  <text x={12} y={42} className="energy-conversion-board__sub-label">
                    {node.code}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
