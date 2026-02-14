import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { relationTypes } from "../../shared/constants/relation-types";
import {
  RankBoardLayout,
  RankCondition,
  RankListQuery,
  RankNode,
  RankPreviousLink,
} from "./rank.types";

const CREATE_RANK = `
CREATE (r:${nodeLabels.rank} {
  id: $id,
  systemId: $systemId,
  name: $name,
  alias: $alias,
  tier: $tier,
  system: $system,
  description: $description,
  notes: $notes,
  tags: $tags,
  color: $color,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN r
`;

const UPDATE_RANK = `
MATCH (r:${nodeLabels.rank} {id: $id})
SET
  r.systemId = $systemId,
  r.name = $name,
  r.alias = $alias,
  r.tier = $tier,
  r.system = $system,
  r.description = $description,
  r.notes = $notes,
  r.tags = $tags,
  r.color = $color,
  r.updatedAt = $updatedAt
RETURN r
`;

const GET_RANKS = `
MATCH (r:${nodeLabels.rank})
OPTIONAL MATCH (rs:${nodeLabels.rankSystem})-[:${relationTypes.hasRank}]->(r)
WITH r, head(collect(rs)) AS rs
WHERE
  ($name IS NULL OR toLower(r.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
  AND ($tier IS NULL OR r.tier = $tier)
  AND ($system IS NULL OR r.system = $system)
  AND ($systemId IS NULL OR coalesce(r.systemId, rs.id) = $systemId)
OPTIONAL MATCH (prev:${nodeLabels.rank})-[rel:${relationTypes.rankNext}]->(r)
WITH r, rs, collect(DISTINCT {
  previousId: prev.id,
  conditions: rel.conditions,
  conditionDescriptions: rel.conditionDescriptions
}) AS previousLinks
OPTIONAL MATCH (r)-[:${relationTypes.rankNext}]->(next:${nodeLabels.rank})
WITH r, rs, previousLinks, collect(DISTINCT next.id) AS nextIds
RETURN r, rs, previousLinks, nextIds
ORDER BY r.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_RANKS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("rank_search", $q) YIELD node, score
WITH node AS r, score
OPTIONAL MATCH (rs:${nodeLabels.rankSystem})-[:${relationTypes.hasRank}]->(r)
WITH r, score, head(collect(rs)) AS rs
WHERE
  ($name IS NULL OR toLower(r.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
  AND ($tier IS NULL OR r.tier = $tier)
  AND ($system IS NULL OR r.system = $system)
  AND ($systemId IS NULL OR coalesce(r.systemId, rs.id) = $systemId)
OPTIONAL MATCH (prev:${nodeLabels.rank})-[rel:${relationTypes.rankNext}]->(r)
WITH r, score, rs, collect(DISTINCT {
  previousId: prev.id,
  conditions: rel.conditions,
  conditionDescriptions: rel.conditionDescriptions
}) AS previousLinks
OPTIONAL MATCH (r)-[:${relationTypes.rankNext}]->(next:${nodeLabels.rank})
WITH r, score, rs, previousLinks, collect(DISTINCT next.id) AS nextIds
RETURN r, rs, previousLinks, nextIds, score
ORDER BY score DESC, r.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const COUNT_RANKS = `
MATCH (r:${nodeLabels.rank})
OPTIONAL MATCH (rs:${nodeLabels.rankSystem})-[:${relationTypes.hasRank}]->(r)
WITH r, head(collect(rs)) AS rs
WHERE
  ($name IS NULL OR toLower(r.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
  AND ($tier IS NULL OR r.tier = $tier)
  AND ($system IS NULL OR r.system = $system)
  AND ($systemId IS NULL OR coalesce(r.systemId, rs.id) = $systemId)
RETURN count(r) AS total
`;

const COUNT_RANKS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("rank_search", $q) YIELD node, score
WITH node AS r, score
OPTIONAL MATCH (rs:${nodeLabels.rankSystem})-[:${relationTypes.hasRank}]->(r)
WITH r, score, head(collect(rs)) AS rs
WHERE
  ($name IS NULL OR toLower(r.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
  AND ($tier IS NULL OR r.tier = $tier)
  AND ($system IS NULL OR r.system = $system)
  AND ($systemId IS NULL OR coalesce(r.systemId, rs.id) = $systemId)
RETURN count(r) AS total
`;

const CHECK_LINK_GUARD = `
MATCH (current:${nodeLabels.rank} {id: $currentId})
MATCH (previous:${nodeLabels.rank} {id: $previousId})
OPTIONAL MATCH p=(current)-[:${relationTypes.rankNext}*1..]->(previous)
RETURN
  current IS NOT NULL AS currentExists,
  previous IS NOT NULL AS previousExists,
  count(p) > 0 AS createsCycle
`;

const LINK_PREVIOUS = `
MATCH (prev:${nodeLabels.rank} {id: $previousId})
MATCH (current:${nodeLabels.rank} {id: $currentId})
MERGE (prev)-[rel:${relationTypes.rankNext}]->(current)
SET rel.conditions = $conditionNames,
    rel.conditionDescriptions = $conditionDescriptions
RETURN rel
`;

const UPDATE_LINK_CONDITIONS = `
MATCH (prev:${nodeLabels.rank} {id: $previousId})-[rel:${relationTypes.rankNext}]->(current:${nodeLabels.rank} {id: $currentId})
SET rel.conditions = $conditionNames,
    rel.conditionDescriptions = $conditionDescriptions
RETURN rel
`;

const UNLINK_PREVIOUS_BY_ID = `
MATCH (prev:${nodeLabels.rank} {id: $previousId})-[rel:${relationTypes.rankNext}]->(current:${nodeLabels.rank} {id: $currentId})
DELETE rel
RETURN 1 AS deleted
`;

const CHECK_RANK_SYSTEM_EXISTS = `
MATCH (rs:${nodeLabels.rankSystem} {id: $systemId})
RETURN count(rs) > 0 AS exists
`;

const LINK_RANK_TO_SYSTEM = `
MATCH (r:${nodeLabels.rank} {id: $rankId})
MATCH (rs:${nodeLabels.rankSystem} {id: $systemId})
OPTIONAL MATCH (:${nodeLabels.rankSystem})-[old:${relationTypes.hasRank}]->(r)
DELETE old
MERGE (rs)-[:${relationTypes.hasRank}]->(r)
RETURN rs.id AS systemId
`;

const GET_RANK_BY_NAME = `
MATCH (r:${nodeLabels.rank})
WHERE toLower(r.name) = toLower($name)
RETURN r
LIMIT 1
`;

const DELETE_RANK = `
MATCH (r:${nodeLabels.rank} {id: $id})
WITH r
DETACH DELETE r
RETURN 1 AS deleted
`;

const GET_RANK_BOARD_LAYOUT = `
OPTIONAL MATCH (layout:${nodeLabels.rankBoardLayout} {id: 'rank-board-layout'})
RETURN layout
LIMIT 1
`;

const UPSERT_RANK_BOARD_LAYOUT = `
MERGE (layout:${nodeLabels.rankBoardLayout} {id: 'rank-board-layout'})
SET
  layout.positions = $positions,
  layout.updatedAt = $updatedAt
RETURN layout
`;

const RANK_PARAMS = [
  "id",
  "systemId",
  "name",
  "alias",
  "tier",
  "system",
  "description",
  "notes",
  "tags",
  "color",
  "createdAt",
  "updatedAt",
];

const RANK_UPDATE_PARAMS = RANK_PARAMS.filter((key) => key !== "createdAt");

const mapRelationConditions = (
  relationProps: Record<string, unknown> | undefined
): RankCondition[] | undefined => {
  if (!relationProps) {
    return undefined;
  }
  const namesRaw = relationProps.conditions;
  if (!Array.isArray(namesRaw)) {
    return undefined;
  }
  const descriptionsRaw = Array.isArray(relationProps.conditionDescriptions)
    ? relationProps.conditionDescriptions
    : [];
  const mapped = namesRaw
    .map((value, index) => {
      const name = typeof value === "string" ? value.trim() : "";
      if (!name) {
        return null;
      }
      const descriptionValue = descriptionsRaw[index];
      const description =
        typeof descriptionValue === "string" && descriptionValue.trim().length > 0
          ? descriptionValue.trim()
          : undefined;
      return { name, description } as RankCondition;
    })
    .filter((value): value is RankCondition => Boolean(value));
  return mapped.length > 0 ? mapped : undefined;
};

const mapPreviousLinks = (
  value: unknown
): RankPreviousLink[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const mapped = value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const raw = item as Record<string, unknown>;
      const previousId = typeof raw.previousId === "string" ? raw.previousId : "";
      if (!previousId) {
        return null;
      }
      const conditions = mapRelationConditions(raw);
      return { previousId, conditions } as RankPreviousLink;
    })
    .filter((item): item is RankPreviousLink => Boolean(item));
  const seen = new Set<string>();
  return mapped.filter((item) => {
    if (seen.has(item.previousId)) {
      return false;
    }
    seen.add(item.previousId);
    return true;
  });
};

export const createRank = async (
  data: RankNode,
  database: string
): Promise<RankNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, RANK_PARAMS);
    const result = await session.run(CREATE_RANK, params);
    const record = result.records[0];
    const node = record?.get("r");
    return mapNode(node?.properties ?? data) as RankNode;
  } finally {
    await session.close();
  }
};

export const updateRank = async (
  data: RankNode,
  database: string
): Promise<RankNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, RANK_UPDATE_PARAMS);
    const result = await session.run(UPDATE_RANK, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("r");
    return mapNode(node?.properties ?? data) as RankNode;
  } finally {
    await session.close();
  }
};

export const getRanks = async (
  database: string,
  query: RankListQuery
): Promise<RankNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_RANKS_BY_SEARCH : GET_RANKS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
      tier: query.tier ?? null,
      system: query.system ?? null,
      systemId: query.systemId ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("r");
      const rankSystem = record.get("rs");
      const previousLinksRaw = record.get("previousLinks");
      const nextIdsRaw = record.get("nextIds");
      const mapped = mapNode(node?.properties ?? {}) as RankNode;
      const previousLinks = mapPreviousLinks(previousLinksRaw);
      const nextIds = Array.isArray(nextIdsRaw)
        ? nextIdsRaw.filter((item): item is string => typeof item === "string")
        : [];
      return {
        ...mapped,
        systemId:
          mapped.systemId ??
          (rankSystem?.properties?.id as string | undefined) ??
          undefined,
        previousLinks: previousLinks.length > 0 ? previousLinks : undefined,
        previousId: previousLinks[0]?.previousId ?? mapped.previousId,
        nextId: nextIds[0] ?? mapped.nextId,
        conditions: previousLinks[0]?.conditions ?? mapped.conditions,
      } as RankNode;
    });
  } finally {
    await session.close();
  }
};

export const getRankCount = async (
  database: string,
  query: RankListQuery
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? COUNT_RANKS_BY_SEARCH : COUNT_RANKS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
      tier: query.tier ?? null,
      system: query.system ?? null,
      systemId: query.systemId ?? null,
    });
    const total = result.records[0]?.get("total");
    if (neo4j.isInt(total)) {
      return total.toNumber();
    }
    return typeof total === "number" ? total : 0;
  } finally {
    await session.close();
  }
};

export const deleteRank = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_RANK, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const getRankByName = async (
  database: string,
  name: string
): Promise<RankNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_RANK_BY_NAME, { name });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("r");
    return mapNode(node?.properties ?? {}) as RankNode;
  } finally {
    await session.close();
  }
};

export const rankSystemExists = async (
  database: string,
  systemId: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHECK_RANK_SYSTEM_EXISTS, { systemId });
    const exists = result.records[0]?.get("exists");
    return exists === true;
  } finally {
    await session.close();
  }
};

export const attachRankToSystem = async (
  database: string,
  rankId: string,
  systemId: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(LINK_RANK_TO_SYSTEM, { rankId, systemId });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const linkRank = async (
  database: string,
  currentId: string,
  previousId: string,
  conditions: RankCondition[] = []
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.executeWrite(async (tx) => {
      if (currentId === previousId) {
        throw new Error("rank cannot link to itself");
      }
      const guard = await tx.run(CHECK_LINK_GUARD, { currentId, previousId });
      const currentExists = guard.records[0]?.get("currentExists") as
        | boolean
        | undefined;
      const previousExists = guard.records[0]?.get("previousExists") as
        | boolean
        | undefined;
      const createsCycle = guard.records[0]?.get("createsCycle") as
        | boolean
        | undefined;
      if (!currentExists) {
        throw new Error("CURRENT rank not found");
      }
      if (!previousExists) {
        throw new Error("PREVIOUS rank not found");
      }
      if (createsCycle) {
        throw new Error("rank link creates cycle");
      }

      await tx.run(LINK_PREVIOUS, {
        previousId,
        currentId,
        conditionNames: conditions.map((condition) => condition.name),
        conditionDescriptions: conditions.map(
          (condition) => condition.description ?? ""
        ),
      });
    });
  } finally {
    await session.close();
  }
};

export const unlinkRank = async (
  database: string,
  currentId: string,
  previousId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(UNLINK_PREVIOUS_BY_ID, { currentId, previousId });
  } finally {
    await session.close();
  }
};

export const updateRankLinkConditions = async (
  database: string,
  currentId: string,
  previousId: string,
  conditions: RankCondition[] = []
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(UPDATE_LINK_CONDITIONS, {
      currentId,
      previousId,
      conditionNames: conditions.map((condition) => condition.name),
      conditionDescriptions: conditions.map(
        (condition) => condition.description ?? ""
      ),
    });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const getRankBoardLayout = async (
  database: string
): Promise<RankBoardLayout> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_RANK_BOARD_LAYOUT);
    const node = result.records[0]?.get("layout");
    const properties = mapNode(
      node?.properties ?? { positions: {}, updatedAt: new Date().toISOString() }
    ) as { positions?: Record<string, unknown>; updatedAt?: string };
    return {
      positions:
        properties.positions && typeof properties.positions === "object"
          ? (properties.positions as Record<string, { x: number; y: number }>)
          : {},
      updatedAt:
        typeof properties.updatedAt === "string"
          ? properties.updatedAt
          : new Date().toISOString(),
    };
  } finally {
    await session.close();
  }
};

export const saveRankBoardLayout = async (
  database: string,
  positions: Record<string, { x: number; y: number }>
): Promise<RankBoardLayout> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const updatedAt = new Date().toISOString();
    const result = await session.run(UPSERT_RANK_BOARD_LAYOUT, {
      positions,
      updatedAt,
    });
    const node = result.records[0]?.get("layout");
    const properties = mapNode(
      node?.properties ?? { positions, updatedAt }
    ) as { positions?: Record<string, unknown>; updatedAt?: string };
    return {
      positions:
        properties.positions && typeof properties.positions === "object"
          ? (properties.positions as Record<string, { x: number; y: number }>)
          : {},
      updatedAt:
        typeof properties.updatedAt === "string"
          ? properties.updatedAt
          : updatedAt,
    };
  } finally {
    await session.close();
  }
};
