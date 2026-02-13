import { useMemo } from "react";
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

export const RelationshipGraph = ({
  items,
  charactersById,
  relationshipTypesByCode,
}: RelationshipGraphProps) => {
  const { t } = useI18n();

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

  if (items.length === 0 || nodeIds.length === 0) {
    return <p className="header__subtitle">{t("No relationships to render as graph.")}</p>;
  }

  return (
    <div className="relationship-graph">
      <div className="relationship-graph__canvas">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
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
