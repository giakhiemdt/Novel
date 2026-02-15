import { useEffect, useMemo, useRef, useState } from "react";
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

type SystemColumn = {
  id: string;
  name: string;
  code?: string;
  domain?: string;
  isVirtual?: boolean;
  left: number;
  width: number;
  ranks: RankWithId[];
};

type TierRow = {
  key: string;
  label: string;
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

const TIER_LABEL_WIDTH = 130;
const COLUMN_WIDTH = 182;
const HEADER_HEIGHT = 72;
const BOARD_PADDING = 12;
const COLUMN_GAP = 10;
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

const buildOrthPathVertical = (
  startX: number,
  startY: number,
  endX: number,
  endY: number
): string => {
  const midY = startY + (endY - startY) / 2;
  return `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`;
};

const getRankColor = (rank: RankWithId): string => rank.color?.trim() || "#6b9fd0";

const sortByName = <T extends { name?: string }>(a: T, b: T): number =>
  (a.name ?? "").localeCompare(b.name ?? "");

export const RankSystemLandscapeBoard = ({
  rankSystems,
  ranks,
}: RankSystemLandscapeBoardProps) => {
  const { t } = useI18n();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) {
      return;
    }
    const update = () => setViewportWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

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

    const tierRows: Array<{ key: string; label: string }> = [];
    if (numericTiers.size > 0) {
      const numbers = Array.from(numericTiers).sort((a, b) => a - b);
      const min = numbers[0] ?? 1;
      const max = numbers[numbers.length - 1] ?? min;
      for (let tier = min; tier <= max; tier += 1) {
        tierRows.push({ key: `n:${tier}`, label: `${t("Tier")} ${tier}` });
      }
    }

    Array.from(textTierKeys)
      .sort((a, b) =>
        (tierLabelByKey.get(a) ?? a).localeCompare(tierLabelByKey.get(b) ?? b)
      )
      .forEach((key) => {
        tierRows.push({ key, label: tierLabelByKey.get(key) ?? key });
      });

    if (hasUntiered) {
      tierRows.push({ key: "u:untiered", label: t("Untiered") });
    }

    if (tierRows.length === 0) {
      tierRows.push({ key: "u:untiered", label: t("Untiered") });
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

    const systemsSeed: Array<{
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
      systemsSeed.push({
        id: "__unassigned__",
        name: t("Unassigned ranks"),
        isVirtual: true,
        ranks: [...unassigned].sort(sortByName),
      });
    }

    const systemCount = Math.max(1, systemsSeed.length);
    const minContentWidth =
      TIER_LABEL_WIDTH +
      BOARD_PADDING * 2 +
      systemCount * COLUMN_WIDTH +
      Math.max(0, systemCount - 1) * COLUMN_GAP;
    const availableForColumns =
      viewportWidth > 0
        ? viewportWidth -
          TIER_LABEL_WIDTH -
          BOARD_PADDING * 2 -
          Math.max(0, systemCount - 1) * COLUMN_GAP
        : systemCount * COLUMN_WIDTH;
    const responsiveColumnWidth = Math.max(
      COLUMN_WIDTH,
      availableForColumns / systemCount
    );

    const systems: SystemColumn[] = systemsSeed.map((seed, index) => ({
      ...seed,
      left:
        TIER_LABEL_WIDTH +
        BOARD_PADDING +
        index * (responsiveColumnWidth + COLUMN_GAP),
      width: responsiveColumnWidth,
    }));

    let yCursor = HEADER_HEIGHT + BOARD_PADDING;

    const rows: TierRow[] = tierRows.map((tier) => {
      const buckets: Record<string, RankWithId[]> = {};
      systems.forEach((system) => {
        buckets[system.id] = [];
      });

      systems.forEach((system) => {
        system.ranks.forEach((rank) => {
          const parsedTier = tierByRankId.get(rank.id) ?? parseTier(rank.tier);
          if (parsedTier.key === tier.key) {
            buckets[system.id]?.push(rank);
          }
        });
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

      const row: TierRow = {
        key: tier.key,
        label: tier.label,
        top: yCursor,
        height: rowHeight,
        buckets,
      };

      yCursor += rowHeight + ROW_GAP;
      return row;
    });

    const nodes: NodeLayout[] = [];

    rows.forEach((row) => {
      systems.forEach((system) => {
        const bucket = row.buckets[system.id] ?? [];
        const centerX = system.left + system.width / 2;

        bucket.forEach((rank, stackIndex) => {
          const y = row.top + ROW_PADDING_Y + stackIndex * (NODE_HEIGHT + STACK_GAP);
          const x = centerX - NODE_WIDTH / 2;
          nodes.push({
            id: rank.id,
            rank,
            systemId: system.id,
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
    systems.forEach((system) => {
      system.ranks.forEach((rank) => {
        const previousIds =
          rank.previousLinks?.map((link) => link.previousId) ??
          (rank.previousId ? [rank.previousId] : []);
        previousIds.forEach((previousId) => {
          const source = nodeById.get(previousId);
          const target = nodeById.get(rank.id);
          if (!source || !target) {
            return;
          }
          edges.push({
            id: `${previousId}-${rank.id}`,
            path: buildOrthPathVertical(
              source.x + source.width / 2,
              source.y + source.height,
              target.x + target.width / 2,
              target.y
            ),
          });
        });
      });
    });

    const width =
      TIER_LABEL_WIDTH +
      BOARD_PADDING * 2 +
      Math.max(1, systems.length) * responsiveColumnWidth +
      Math.max(0, systems.length - 1) * COLUMN_GAP;
    const finalWidth = Math.max(minContentWidth, viewportWidth, width);
    const height = Math.max(HEADER_HEIGHT + 90, yCursor + BOARD_PADDING - ROW_GAP);

    return {
      rows,
      systems,
      nodes,
      edges,
      width: finalWidth,
      height,
    };
  }, [rankSystems, ranks, t, viewportWidth]);

  if (layout.rows.length === 0) {
    return <p className="header__subtitle">{t("No rank systems available.")}</p>;
  }

  return (
    <div className="rank-system-matrix-wrap" ref={wrapRef}>
      <div className="rank-system-matrix" style={{ width: layout.width, height: layout.height }}>
        {layout.systems.map((system) => (
          <div
            key={system.id}
            className="rank-system-matrix__tier-column"
            style={{
              left: system.left,
              width: system.width,
            }}
          >
            <span className="rank-system-matrix__tier-title">{system.name}</span>
          </div>
        ))}

        {layout.rows.map((row) => (
          <div
            key={`row-${row.key}`}
            className="rank-system-matrix__row"
            style={{ top: row.top, height: row.height }}
          >
            <div className="rank-system-matrix__system-label">
              <strong>{row.label}</strong>
            </div>
          </div>
        ))}

        <svg className="rank-system-matrix__edges" width={layout.width} height={layout.height} aria-hidden="true">
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
