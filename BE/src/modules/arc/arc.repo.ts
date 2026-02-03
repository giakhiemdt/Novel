import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { ArcListQuery, ArcNode } from "./arc.types";

const CREATE_ARC = `
CREATE (a:${nodeLabels.arc} {
  id: $id,
  name: $name,
  order: $order,
  summary: $summary,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN a
`;

const UPDATE_ARC = `
MATCH (a:${nodeLabels.arc} {id: $id})
SET
  a.name = $name,
  a.order = $order,
  a.summary = $summary,
  a.notes = $notes,
  a.tags = $tags,
  a.updatedAt = $updatedAt
RETURN a
`;

const GET_ARCS = `
MATCH (a:${nodeLabels.arc})
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(a.tags, []))
RETURN a
ORDER BY a.order ASC, a.createdAt DESC
SKIP $offset
LIMIT $limit
`;

const GET_ARCS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("arc_search", $q) YIELD node, score
WITH node AS a, score
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(a.tags, []))
RETURN a
ORDER BY score DESC, a.order ASC, a.createdAt DESC
SKIP $offset
LIMIT $limit
`;

const DELETE_ARC = `
MATCH (a:${nodeLabels.arc} {id: $id})
WITH a
DETACH DELETE a
RETURN 1 AS deleted
`;

const ARC_PARAMS = [
  "id",
  "name",
  "order",
  "summary",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const ARC_UPDATE_PARAMS = ARC_PARAMS.filter((key) => key !== "createdAt");

export const createArc = async (
  data: ArcNode,
  database: string
): Promise<ArcNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, ARC_PARAMS);
    const result = await session.run(CREATE_ARC, params);
    const record = result.records[0];
    const node = record?.get("a");
    return mapNode(node?.properties ?? data) as ArcNode;
  } finally {
    await session.close();
  }
};

export const updateArc = async (
  data: ArcNode,
  database: string
): Promise<ArcNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, ARC_UPDATE_PARAMS);
    const result = await session.run(UPDATE_ARC, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("a");
    return mapNode(node?.properties ?? data) as ArcNode;
  } finally {
    await session.close();
  }
};

export const getArcs = async (
  database: string,
  query: ArcListQuery
): Promise<ArcNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_ARCS_BY_SEARCH : GET_ARCS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("a");
      return mapNode(node?.properties ?? {}) as ArcNode;
    });
  } finally {
    await session.close();
  }
};

export const deleteArc = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_ARC, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};
