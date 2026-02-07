import neo4j, { type Integer } from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { relationTypes } from "../../shared/constants/relation-types";
import { RankCondition, RankListQuery, RankNode } from "./rank.types";

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
OPTIONAL MATCH (prev:${nodeLabels.rank})-[rel:${relationTypes.rankNext}]->(r)
OPTIONAL MATCH (r)-[:${relationTypes.rankNext}]->(next:${nodeLabels.rank})
WHERE
  ($name IS NULL OR toLower(r.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
  AND ($tier IS NULL OR r.tier = $tier)
  AND ($system IS NULL OR r.system = $system)
  AND ($systemId IS NULL OR coalesce(r.systemId, rs.id) = $systemId)
RETURN r, prev, next, rel, rs
ORDER BY r.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_RANKS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("rank_search", $q) YIELD node, score
WITH node AS r, score
OPTIONAL MATCH (rs:${nodeLabels.rankSystem})-[:${relationTypes.hasRank}]->(r)
WITH r, score, head(collect(rs)) AS rs
OPTIONAL MATCH (prev:${nodeLabels.rank})-[rel:${relationTypes.rankNext}]->(r)
OPTIONAL MATCH (r)-[:${relationTypes.rankNext}]->(next:${nodeLabels.rank})
WHERE
  ($name IS NULL OR toLower(r.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
  AND ($tier IS NULL OR r.tier = $tier)
  AND ($system IS NULL OR r.system = $system)
  AND ($systemId IS NULL OR coalesce(r.systemId, rs.id) = $systemId)
RETURN r, prev, next, rel, rs
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

const CHECK_NEXT = `
MATCH (r:${nodeLabels.rank} {id: $id})
OPTIONAL MATCH (r)-[:${relationTypes.rankNext}]->(n)
RETURN r IS NOT NULL AS exists, count(n) AS nextCount
`;

const CHECK_PREVIOUS = `
MATCH (r:${nodeLabels.rank} {id: $id})
OPTIONAL MATCH (p)-[:${relationTypes.rankNext}]->(r)
RETURN count(p) AS prevCount
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
      const previous = record.get("prev");
      const next = record.get("next");
      const rel = record.get("rel");
      const rankSystem = record.get("rs");
      const mapped = mapNode(node?.properties ?? {}) as RankNode;
      return {
        ...mapped,
        systemId:
          mapped.systemId ??
          (rankSystem?.properties?.id as string | undefined) ??
          undefined,
        previousId: previous?.properties?.id ?? undefined,
        nextId: next?.properties?.id ?? undefined,
        conditions: mapRelationConditions(
          rel?.properties as Record<string, unknown> | undefined
        ),
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
      const prevCheck = await tx.run(CHECK_NEXT, { id: previousId });
      const prevExists = prevCheck.records[0]?.get("exists") as boolean | undefined;
      const prevNextCount = prevCheck.records[0]?.get("nextCount") as
        | Integer
        | undefined;
      if (!prevExists) {
        throw new Error("PREVIOUS rank not found");
      }
      if (prevNextCount && prevNextCount.toNumber() > 0) {
        throw new Error("PREVIOUS rank already has NEXT");
      }

      const currentPrevCheck = await tx.run(CHECK_PREVIOUS, { id: currentId });
      const currentPrevCount = currentPrevCheck.records[0]?.get("prevCount") as
        | Integer
        | undefined;
      if (currentPrevCount && currentPrevCount.toNumber() > 0) {
        throw new Error("CURRENT rank already has PREVIOUS");
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
