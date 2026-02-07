import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
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
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_ARCS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("arc_search", $q) YIELD node, score
WITH node AS a, score
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(a.tags, []))
RETURN a
ORDER BY score DESC, a.order ASC, a.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const COUNT_ARCS = `
MATCH (a:${nodeLabels.arc})
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(a.tags, []))
RETURN count(a) AS total
`;

const COUNT_ARCS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("arc_search", $q) YIELD node, score
WITH node AS a, score
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(a.tags, []))
RETURN count(a) AS total
`;

const DELETE_ARC = `
MATCH (a:${nodeLabels.arc} {id: $id})
WITH a
DETACH DELETE a
RETURN 1 AS deleted
`;

const GET_ARC_STRUCTURE = `
MATCH (a:${nodeLabels.arc})
OPTIONAL MATCH (a)-[:${relationTypes.arcHasChapter}]->(c:${nodeLabels.chapter})
OPTIONAL MATCH (c)-[:${relationTypes.chapterHasScene}]->(s:${nodeLabels.scene})
RETURN a, c, s
ORDER BY a.order ASC, a.createdAt DESC, c.order ASC, c.createdAt DESC, s.order ASC, s.createdAt DESC
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

export const getArcCount = async (
  database: string,
  query: ArcListQuery
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? COUNT_ARCS_BY_SEARCH : COUNT_ARCS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
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

export const getArcStructure = async (
  database: string
): Promise<{
  arc: ArcNode;
  chapter?: Record<string, unknown>;
  scene?: Record<string, unknown>;
}[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_ARC_STRUCTURE);
    return result.records.map((record) => {
      const arc = record.get("a");
      const chapter = record.get("c");
      const scene = record.get("s");
      const resultRow: {
        arc: ArcNode;
        chapter?: Record<string, unknown>;
        scene?: Record<string, unknown>;
      } = {
        arc: mapNode(arc?.properties ?? {}) as ArcNode,
      };

      if (chapter?.properties) {
        resultRow.chapter = mapNode(chapter.properties) as Record<string, unknown>;
      }
      if (scene?.properties) {
        resultRow.scene = mapNode(scene.properties) as Record<string, unknown>;
      }

      return resultRow;
    });
  } finally {
    await session.close();
  }
};
