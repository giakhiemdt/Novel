import { useMemo } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import type { Rank } from "../rank/rank.types";
import type { RankSystem } from "./rank-system.types";

type RankSystemLandscapeBoardProps = {
  rankSystems: RankSystem[];
  ranks: Rank[];
};

type RankWithId = Rank & { id: string };

type TierInfo = {
  key: string;
  label: string;
  numeric: number | null;
};

type SystemRow = {
  id: string;
  name: string;
  code?: string;
  domain?: string;
  isVirtual?: boolean;
  ranks: RankWithId[];
  top: number;
  height: number;
  buckets: Record<string, RankWithId[]>;
};

type NodeLayout = {
  id: string;
  rank: RankWithId;
  systemId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type EdgeLayout = {
  id: string;
  path: string;
};

const SYSTEM_LABEL_WIDTH = 220;
const COLUMN_WIDTH = 190;
const HEADER_HEIGHT = 56;
const BOARD_PADDING = 12;
const ROW_GAP = 12;
const ROW_MIN_HEIGHT = 72;
const ROW_PADDING_Y = 10;
const STACK_GAP = 8;
const NODE_WIDTH = 148;
const NODE_HEIGHT = 34;

const extractTierNumber = (value: string): number | null => {
  const match = value.match(/\d+/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseTier = (tier: string | undefined): TierInfo => {
  const trimmed = tier?.trim() ?? "";
  if (!trimmed) {
    return {
      key: "u:untiered",
      label: "Untiered",
      numeric: null,
    };
  }

  const numeric = extractTierNumber(trimmed);
  if (numeric !== null) {
    return {
      key: `n:${numeric}`,
      label: `Tier ${numeric}`,
      numeric,
    };
  }

  return {
    key: `s:${trimmed.toLowerCase()}`,
    label: trimmed,
    numeric: null,
  };
};

const buildOrthPath = (startX: number, startY: number, endX: number, endY: number): string => {
  const midX = startX + (endX - startX) / 2;
  return `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
};

const getRankColor = (rank: RankWithId): string => rank.color?.trim() || "#6b9fd0";

const sortByName = <T extends { name?: string }>(a: T, b: T): number =>
  (a.name ?? "").localeCompare(b.name ?? "");

export const RankSystemLandscapeBoard = ({
  rankSystems,
  ranks,
}: RankSystemLandscapeBoardProps) => {
  const { t } = useI18n();

  const layout = useMemo(() => {
    const validRanks = ranks.filter((rank): rank is RankWithId => Boolean(rank.id));

    const tierByRankId = new Map<string, TierInfo>();
    const tierLabelByKey = new Map<string, string>();
    const numericTiers = new Set<number>();
    const textTierKeys = new Set<string>();
    let hasUntiered = false;

    validRanks.forEach((rank) => {
      const tier = parseTier(rank.tier);
      tierByRankId.set(rank.id, tier);
      tierLabelByKey.set(tier.key, tier.label);
      if (tier.key === "u:untiered") {
        hasUntiered = true;
      } else if (tier.numeric !== null) {
        numericTiers.add(tier.numeric);
      } else {
        textTierKeys.add(tier.key);
      }
    });

    const tierColumns: Array<{ key: string; label: string }> = [];
    if (numericTiers.size > 0) {
      const numbers = Array.from(numericTiers).sort((a, b) => a - b);
      const min = numbers[0] ?? 1;
      const max = numbers[numbers.length - 1] ?? min;
      for (let tier = min; tier <= max; tier += 1) {
        tierColumns.push({ key: `n:${tier}`, label: `${t("Tier")} ${tier}` });
      }
    }

    Array.from(textTierKeys)
      .sort((a, b) =>
        (tierLabelByKey.get(a) ?? a).localeCompare(tierLabelByKey.get(b) ?? b)
      )
      .forEach((key) => {
        tierColumns.push({ key, label: tierLabelByKey.get(key) ?? key });
      });

    if (hasUntiered) {
      tierColumns.push({ key: "u:untiered", label: t("Untiered") });
    }

    if (tierColumns.length === 0) {
      tierColumns.push({ key: "u:untiered", label: t("Untiered") });
    }

    const ranksBySystem = new Map<string, RankWithId[]>();
    const unassigned: RankWithId[] = [];

    validRanks.forEach((rank) => {
      const systemId = rank.systemId?.trim();
      if (!systemId) {
        unassigned.push(rank);
        return;
      }
      const list = ranksBySystem.get(systemId) ?? [];
      list.push(rank);
      ranksBySystem.set(systemId, list);
    });

    const baseSystems = [...rankSystems].sort((a, b) => {
      const priorityA = a.priority ?? Number.MAX_SAFE_INTEGER;
      const priorityB = b.priority ?? Number.MAX_SAFE_INTEGER;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return sortByName(a, b);
    });

    const rowsSeed: Array<{
      id: string;
      name: string;
      code?: string;
      domain?: string;
      isVirtual?: boolean;
      ranks: RankWithId[];
    }> = baseSystems.map((system) => ({
      id: system.id,
      name: system.name,
      code: system.code,
      domain: system.domain,
      ranks: (ranksBySystem.get(system.id) ?? []).sort(sortByName),
    }));

    if (unassigned.length > 0) {
      rowsSeed.push({
        id: "__unassigned__",
        name: t("Unassigned ranks"),
        isVirtual: true,
        ranks: [...unassigned].sort(sortByName),
      });
    }

    let yCursor = HEADER_HEIGHT + BOARD_PADDING;

    const rows: SystemRow[] = rowsSeed.map((seed) => {
      const buckets: Record<string, RankWithId[]> = {};
      tierColumns.forEach((column) => {
        buckets[column.key] = [];
      });

      seed.ranks.forEach((rank) => {
        const parsedTier = tierByRankId.get(rank.id) ?? parseTier(rank.tier);
        const key = parsedTier.key;
        if (!buckets[key]) {
          buckets[key] = [];
        }
        buckets[key]?.push(rank);
      });

      Object.keys(buckets).forEach((key) => {
        buckets[key]?.sort(sortByName);
      });

      const maxStack = Math.max(
        1,
        ...Object.values(buckets).map((bucket) => bucket.length)
      );

      const rowHeight = Math.max(
        ROW_MIN_HEIGHT,
        ROW_PADDING_Y * 2 +
          maxStack * NODE_HEIGHT +
          Math.max(0, maxStack - 1) * STACK_GAP
      );

      const row: SystemRow = {
        ...seed,
        top: yCursor,
        height: rowHeight,
        buckets,
      };

      yCursor += rowHeight + ROW_GAP;
      return row;
    });

    const nodes: NodeLayout[] = [];

    rows.forEach((row) => {
      tierColumns.forEach((column, columnIndex) => {
        const bucket = row.buckets[column.key] ?? [];
        const centerX =
          SYSTEM_LABEL_WIDTH +
          BOARD_PADDING +
          columnIndex * COLUMN_WIDTH +
          COLUMN_WIDTH / 2;

        bucket.forEach((rank, stackIndex) => {
          const y =
            row.top + ROW_PADDING_Y + stackIndex * (NODE_HEIGHT + STACK_GAP);
          const x = centerX - NODE_WIDTH / 2;
          nodes.push({
            id: rank.id,
            rank,
            systemId: row.id,
            x,
            y,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          });
        });
      });
    });

    const nodeById = new Map(nodes.map((node) => [node.id, node]));

    const edges: EdgeLayout[] = [];
    rows.forEach((row) => {
      row.ranks.forEach((rank) => {
        if (!rank.previousId) {
          return;
        }
        const source = nodeById.get(rank.previousId);
        const target = nodeById.get(rank.id);
        if (!source || !target) {
          return;
        }
        edges.push({
          id: `${rank.previousId}-${rank.id}`,
          path: buildOrthPath(
            source.x + source.width,
            source.y + source.height / 2,
            target.x,
            target.y + target.height / 2
          ),
        });
      });
    });

    const width =
      SYSTEM_LABEL_WIDTH +
      BOARD_PADDING * 2 +
      tierColumns.length * COLUMN_WIDTH;
    const height = Math.max(
      HEADER_HEIGHT + 90,
      yCursor + BOARD_PADDING - ROW_GAP
    );

    return {
      rows,
      nodes,
      edges,
      tierColumns,
      width,
      height,
    };
  }, [rankSystems, ranks, t]);

  if (layout.rows.length === 0) {
    return <p className="header__subtitle">{t("No rank systems available.")}</p>;
  }

  return (
    <div className="rank-system-matrix-wrap">
      <div
        className="rank-system-matrix"
        style={{ width: layout.width, height: layout.height }}
      >
        {layout.tierColumns.map((column, index) => (
          <div
            key={column.key}
            className="rank-system-matrix__tier-column"
            style={{
              left: SYSTEM_LABEL_WIDTH + BOARD_PADDING + index * COLUMN_WIDTH,
              width: COLUMN_WIDTH,
            }}
          >
            <span className="rank-system-matrix__tier-title">{column.label}</span>
          </div>
        ))}

        {layout.rows.map((row) => (
          <div
            key={`row-${row.id}`}
            className="rank-system-matrix__row"
            style={{ top: row.top, height: row.height }}
          >
            <div className="rank-system-matrix__system-label">
              <strong>{row.name}</strong>
              <span>
                {row.code ? `#${row.code}` : "-"}
                {row.domain ? ` • ${row.domain}` : ""}
              </span>
            </div>
          </div>
        ))}

        <svg
          className="rank-system-matrix__edges"
          width={layout.width}
          height={layout.height}
          aria-hidden="true"
        >
          {layout.edges.map((edge) => (
            <path key={edge.id} d={edge.path} className="rank-system-matrix__edge" />
          ))}
        </svg>

        {layout.nodes.map((node) => (
          <div
            key={node.id}
            className="rank-system-matrix__node"
            style={{
              width: node.width,
              transform: `translate(${node.x}px, ${node.y}px)`,
              borderColor: `${getRankColor(node.rank)}66`,
              background: `${getRankColor(node.rank)}22`,
            }}
            title={node.rank.name}
          >
            <span>{node.rank.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
