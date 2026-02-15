import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { RankSystemListQuery, RankSystemNode } from "./rank-system.types";

const CREATE_RANK_SYSTEM = `
CREATE (rs:${nodeLabels.rankSystem} {
  id: $id,
  name: $name,
  code: $code,
  description: $description,
  domain: $domain,
  energyType: $energyType,
  priority: $priority,
  isPrimary: $isPrimary,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
WITH rs
OPTIONAL MATCH (et:${nodeLabels.energyType} {id: $energyTypeId})
FOREACH (_ IN CASE WHEN et IS NULL THEN [] ELSE [1] END |
  MERGE (rs)-[:${relationTypes.usesEnergy}]->(et)
)
RETURN rs { .*, energyTypeId: et.id, energyTypeName: et.name } AS rs
`;

const UPDATE_RANK_SYSTEM = `
MATCH (rs:${nodeLabels.rankSystem} {id: $id})
SET
  rs.name = $name,
  rs.code = $code,
  rs.description = $description,
  rs.domain = $domain,
  rs.energyType = $energyType,
  rs.priority = $priority,
  rs.isPrimary = $isPrimary,
  rs.tags = $tags,
  rs.updatedAt = $updatedAt
WITH rs
OPTIONAL MATCH (rs)-[oldRel:${relationTypes.usesEnergy}]->(:${nodeLabels.energyType})
DELETE oldRel
WITH rs
OPTIONAL MATCH (et:${nodeLabels.energyType} {id: $energyTypeId})
FOREACH (_ IN CASE WHEN et IS NULL THEN [] ELSE [1] END |
  MERGE (rs)-[:${relationTypes.usesEnergy}]->(et)
)
RETURN rs { .*, energyTypeId: et.id, energyTypeName: et.name } AS rs
`;

const GET_RANK_SYSTEMS = `
MATCH (rs:${nodeLabels.rankSystem})
OPTIONAL MATCH (rs)-[:${relationTypes.usesEnergy}]->(et:${nodeLabels.energyType})
WHERE
  ($name IS NULL OR toLower(rs.name) CONTAINS toLower($name))
  AND ($domain IS NULL OR rs.domain = $domain)
  AND ($energyTypeId IS NULL OR et.id = $energyTypeId)
RETURN rs { .*, energyTypeId: et.id, energyTypeName: et.name } AS rs
ORDER BY rs.priority ASC, rs.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_RANK_SYSTEMS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("rank_system_search", $q) YIELD node, score
WITH node AS rs, score
OPTIONAL MATCH (rs)-[:${relationTypes.usesEnergy}]->(et:${nodeLabels.energyType})
WHERE
  ($name IS NULL OR toLower(rs.name) CONTAINS toLower($name))
  AND ($domain IS NULL OR rs.domain = $domain)
  AND ($energyTypeId IS NULL OR et.id = $energyTypeId)
RETURN rs { .*, energyTypeId: et.id, energyTypeName: et.name } AS rs, score
ORDER BY score DESC, rs.priority ASC, rs.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const COUNT_RANK_SYSTEMS = `
MATCH (rs:${nodeLabels.rankSystem})
OPTIONAL MATCH (rs)-[:${relationTypes.usesEnergy}]->(et:${nodeLabels.energyType})
WHERE
  ($name IS NULL OR toLower(rs.name) CONTAINS toLower($name))
  AND ($domain IS NULL OR rs.domain = $domain)
  AND ($energyTypeId IS NULL OR et.id = $energyTypeId)
RETURN count(rs) AS total
`;

const COUNT_RANK_SYSTEMS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("rank_system_search", $q) YIELD node, score
WITH node AS rs, score
OPTIONAL MATCH (rs)-[:${relationTypes.usesEnergy}]->(et:${nodeLabels.energyType})
WHERE
  ($name IS NULL OR toLower(rs.name) CONTAINS toLower($name))
  AND ($domain IS NULL OR rs.domain = $domain)
  AND ($energyTypeId IS NULL OR et.id = $energyTypeId)
RETURN count(rs) AS total
`;

const DELETE_RANK_SYSTEM = `
MATCH (rs:${nodeLabels.rankSystem} {id: $id})
WITH rs
DETACH DELETE rs
RETURN 1 AS deleted
`;

const CHECK_RANK_SYSTEM_EXISTS = `
MATCH (rs:${nodeLabels.rankSystem} {id: $id})
RETURN count(rs) > 0 AS exists
`;

const RANK_SYSTEM_PARAMS = [
  "id",
  "name",
  "code",
  "description",
  "domain",
  "energyTypeId",
  "energyType",
  "priority",
  "isPrimary",
  "tags",
  "createdAt",
  "updatedAt",
];

const RANK_SYSTEM_UPDATE_PARAMS = RANK_SYSTEM_PARAMS.filter(
  (key) => key !== "createdAt"
);

export const createRankSystem = async (
  data: RankSystemNode,
  database: string
): Promise<RankSystemNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, RANK_SYSTEM_PARAMS);
    const result = await session.run(CREATE_RANK_SYSTEM, params);
    const record = result.records[0];
    const node = record?.get("rs");
    return mapNode(node ?? data) as RankSystemNode;
  } finally {
    await session.close();
  }
};

export const updateRankSystem = async (
  data: RankSystemNode,
  database: string
): Promise<RankSystemNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, RANK_SYSTEM_UPDATE_PARAMS);
    const result = await session.run(UPDATE_RANK_SYSTEM, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("rs");
    return mapNode(node ?? data) as RankSystemNode;
  } finally {
    await session.close();
  }
};

export const getRankSystems = async (
  database: string,
  query: RankSystemListQuery
): Promise<RankSystemNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_RANK_SYSTEMS_BY_SEARCH : GET_RANK_SYSTEMS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      domain: query.domain ?? null,
      energyTypeId: query.energyTypeId ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("rs");
      return mapNode(node ?? {}) as RankSystemNode;
    });
  } finally {
    await session.close();
  }
};

export const getRankSystemCount = async (
  database: string,
  query: RankSystemListQuery
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q
      ? COUNT_RANK_SYSTEMS_BY_SEARCH
      : COUNT_RANK_SYSTEMS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      domain: query.domain ?? null,
      energyTypeId: query.energyTypeId ?? null,
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

export const deleteRankSystem = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_RANK_SYSTEM, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const rankSystemExists = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHECK_RANK_SYSTEM_EXISTS, { id });
    const exists = result.records[0]?.get("exists");
    return exists === true;
  } finally {
    await session.close();
  }
};
