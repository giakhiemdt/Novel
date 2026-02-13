import {
  type PointerEvent,
  type WheelEvent,
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

export const RelationshipGraph = ({
  items,
  charactersById,
  relationshipTypesByCode,
}: RelationshipGraphProps) => {
  const { t } = useI18n();
  const boardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState(DEFAULT_PAN);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

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

  const layout = useMemo(() => buildLayout(nodeIds, labels), [nodeIds, labels]);

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
    const clamped = clampScale(nextScale);
    if (clamped === scale) {
      return;
    }
    const ratio = clamped / scale;
    const nextPanX = pointerX - (pointerX - pan.x) * ratio;
    const nextPanY = pointerY - (pointerY - pan.y) * ratio;
    setScale(clamped);
    setPan({ x: nextPanX, y: nextPanY });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const nextScale = scale - event.deltaY * 0.0012;
    setZoomAtPointer(nextScale, pointerX, pointerY);
  };

  const handleBoardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest(".relationship-graph__toolbar")) {
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
    if (!isPanning) {
      return;
    }
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    setPan({
      x: event.clientX - rect.left - panStart.x,
      y: event.clientY - rect.top - panStart.y,
    });
  };

  const handleBoardPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPanning) {
      return;
    }
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  if (items.length === 0 || nodeIds.length === 0) {
    return <p className="header__subtitle">{t("No relationships to render as graph.")}</p>;
  }

  return (
    <div className="relationship-graph">
      <div
        className={`relationship-graph__board${isPanning ? " relationship-graph__board--panning" : ""}`}
        ref={boardRef}
        onWheel={handleWheel}
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

            {items.map((item, index) => {
              const from = layout[item.fromId];
              const to = layout[item.toId];
              if (!from || !to) {
                return null;
              }

              const color = getEdgeColor(item.type, index, relationshipTypesByCode);
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const distance = Math.hypot(dx, dy) || 1;
              const offsetX = (dx / distance) * NODE_RADIUS;
              const offsetY = (dy / distance) * NODE_RADIUS;
              const startX = from.x + offsetX;
              const startY = from.y + offsetY;
              const endX = to.x - offsetX;
              const endY = to.y - offsetY;
              const controlX = (startX + endX) / 2 - (dy / distance) * 18;
              const controlY = (startY + endY) / 2 + (dx / distance) * 18;

              return (
                <g key={`${item.fromId}-${item.toId}-${item.type}-${index}`}>
                  <path
                    d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                    className="relationship-graph__edge"
                    style={{ color }}
                    markerEnd="url(#relationship-graph-arrow)"
                  />
                </g>
              );
            })}

            {nodeIds.map((id) => {
              const node = layout[id];
              if (!node) {
                return null;
              }

              return (
                <g key={id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={NODE_RADIUS}
                    className="relationship-graph__node"
                  />
                  <text
                    x={node.x}
                    y={node.y + NODE_RADIUS + 16}
                    className="relationship-graph__label"
                    textAnchor="middle"
                  >
                    {node.label}
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
