import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { RankListQuery, RankNode } from "./rank.types";

const CREATE_RANK = `
CREATE (r:${nodeLabels.rank} {
  id: $id,
  name: $name,
  alias: $alias,
  tier: $tier,
  system: $system,
  description: $description,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN r
`;

const UPDATE_RANK = `
MATCH (r:${nodeLabels.rank} {id: $id})
SET
  r.name = $name,
  r.alias = $alias,
  r.tier = $tier,
  r.system = $system,
  r.description = $description,
  r.notes = $notes,
  r.tags = $tags,
  r.updatedAt = $updatedAt
RETURN r
`;

const GET_RANKS = `
MATCH (r:${nodeLabels.rank})
WHERE
  ($name IS NULL OR toLower(r.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
  AND ($tier IS NULL OR r.tier = $tier)
  AND ($system IS NULL OR r.system = $system)
RETURN r
ORDER BY r.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_RANKS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("rank_search", $q) YIELD node, score
WITH node AS r, score
WHERE
  ($name IS NULL OR toLower(r.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
  AND ($tier IS NULL OR r.tier = $tier)
  AND ($system IS NULL OR r.system = $system)
RETURN r
ORDER BY score DESC, r.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
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
  "name",
  "alias",
  "tier",
  "system",
  "description",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const RANK_UPDATE_PARAMS = RANK_PARAMS.filter((key) => key !== "createdAt");

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
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("r");
      return mapNode(node?.properties ?? {}) as RankNode;
    });
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
