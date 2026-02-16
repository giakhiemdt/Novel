import { useMemo } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { EnergyType } from "./energy-type.types";

type EnergyTypeLevelBoardProps = {
  items: EnergyType[];
};

type TierRow = {
  level: number;
  top: number;
  height: number;
};

type TypeColumn = {
  id: string;
  name: string;
  code?: string;
  left: number;
  width: number;
  color: string;
  levelCount: number;
  ratios: number[];
};

type NodeLayout = {
  id: string;
  label: string;
  ratioLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

const TYPE_LABEL_WIDTH = 150;
const COLUMN_WIDTH = 182;
const HEADER_HEIGHT = 72;
const BOARD_PADDING = 12;
const COLUMN_GAP = 10;
const ROW_GAP = 12;
const ROW_HEIGHT = 78;
const NODE_WIDTH = 150;
const NODE_HEIGHT = 36;

const normalizeRatios = (ratios: number[] | undefined, levelCount: number): number[] => {
  if (!ratios || ratios.length === 0) {
    return Array.from({ length: levelCount }, (_, index) => index + 1);
  }
  const next = [...ratios];
  if (next.length >= levelCount) {
    return next.slice(0, levelCount);
  }
  const last = next[next.length - 1] ?? 1;
  while (next.length < levelCount) {
    next.push(last);
  }
  return next;
};

export const EnergyTypeLevelBoard = ({ items }: EnergyTypeLevelBoardProps) => {
  const { t } = useI18n();

  const layout = useMemo(() => {
    const sortedTypes = [...items]
      .filter((item) => item.id)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    const types: TypeColumn[] = sortedTypes.map((item, index) => {
      const levelCount =
        typeof item.levelCount === "number" && Number.isFinite(item.levelCount)
          ? Math.max(1, Math.floor(item.levelCount))
          : 1;
      const ratios = normalizeRatios(item.levelRatios, levelCount);
      return {
        id: item.id,
        name: item.name,
        code: item.code,
        left: TYPE_LABEL_WIDTH + BOARD_PADDING + index * (COLUMN_WIDTH + COLUMN_GAP),
        width: COLUMN_WIDTH,
        color: item.color?.trim() || "#6B7280",
        levelCount,
        ratios,
      };
    });

    const maxLevel = Math.max(1, ...types.map((type) => type.levelCount));

    let yCursor = HEADER_HEIGHT + BOARD_PADDING;
    const rows: TierRow[] = [];
    for (let level = 1; level <= maxLevel; level += 1) {
      rows.push({
        level,
        top: yCursor,
        height: ROW_HEIGHT,
      });
      yCursor += ROW_HEIGHT + ROW_GAP;
    }

    const nodes: NodeLayout[] = [];
    rows.forEach((row) => {
      types.forEach((type) => {
        if (row.level > type.levelCount) {
          return;
        }
        const ratio = type.ratios[row.level - 1] ?? row.level;
        const centerX = type.left + type.width / 2;
        nodes.push({
          id: `${type.id}-${row.level}`,
          label: `${t("Level")} ${row.level}`,
          ratioLabel: `${t("Ratio")}: ${ratio}`,
          x: centerX - NODE_WIDTH / 2,
          y: row.top + (row.height - NODE_HEIGHT) / 2,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          color: type.color,
        });
      });
    });

    const width =
      TYPE_LABEL_WIDTH +
      BOARD_PADDING * 2 +
      Math.max(1, types.length) * COLUMN_WIDTH +
      Math.max(0, types.length - 1) * COLUMN_GAP;
    const height = Math.max(HEADER_HEIGHT + 100, yCursor + BOARD_PADDING - ROW_GAP);

    return { types, rows, nodes, width, height };
  }, [items, t]);

  if (items.length === 0) {
    return <p className="header__subtitle">{t("No energy types yet.")}</p>;
  }

  return (
    <div className="energy-type-level-board">
      <div className="energy-type-level-matrix-wrap" style={{ minWidth: layout.width }}>
        <div className="energy-type-level-matrix" style={{ width: layout.width, height: layout.height }}>
          {layout.types.map((type) => (
            <div
              key={`col-${type.id}`}
              className="energy-type-level-matrix__tier-column"
              style={{ left: type.left, width: type.width }}
            >
              <span className="energy-type-level-matrix__tier-title">{type.name}</span>
              {type.code ? <span className="energy-type-level-matrix__tier-code">{type.code}</span> : null}
            </div>
          ))}

          {layout.rows.map((row) => (
            <div
              key={`row-${row.level}`}
              className="energy-type-level-matrix__row"
              style={{ top: row.top, height: row.height }}
            >
              <div className="energy-type-level-matrix__level-label">
                <strong>{t("Level")} {row.level}</strong>
              </div>
            </div>
          ))}

          {layout.nodes.map((node) => (
            <div
              key={node.id}
              className="energy-type-level-matrix__node"
              style={{
                left: node.x,
                top: node.y,
                width: node.width,
                borderColor: node.color,
                background: `${node.color}22`,
              }}
            >
              <span>{node.label}</span>
              <small>{node.ratioLabel}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
