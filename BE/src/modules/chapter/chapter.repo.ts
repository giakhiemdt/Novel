import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { ChapterListQuery, ChapterNode } from "./chapter.types";

const CREATE_CHAPTER = `
CREATE (c:${nodeLabels.chapter} {
  id: $id,
  name: $name,
  order: $order,
  summary: $summary,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN c
`;

const CREATE_CHAPTER_WITH_ARC = `
MATCH (a:${nodeLabels.arc} {id: $arcId})
CREATE (c:${nodeLabels.chapter} {
  id: $id,
  name: $name,
  order: $order,
  summary: $summary,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
CREATE (a)-[:${relationTypes.arcHasChapter}]->(c)
RETURN c, a
`;

const UPDATE_CHAPTER = `
MATCH (c:${nodeLabels.chapter} {id: $id})
SET
  c.name = $name,
  c.order = $order,
  c.summary = $summary,
  c.notes = $notes,
  c.tags = $tags,
  c.updatedAt = $updatedAt
RETURN c
`;

const UPDATE_CHAPTER_WITH_ARC = `
MATCH (c:${nodeLabels.chapter} {id: $id})
MATCH (a:${nodeLabels.arc} {id: $arcId})
OPTIONAL MATCH (old:${nodeLabels.arc})-[r:${relationTypes.arcHasChapter}]->(c)
DELETE r
SET
  c.name = $name,
  c.order = $order,
  c.summary = $summary,
  c.notes = $notes,
  c.tags = $tags,
  c.updatedAt = $updatedAt
CREATE (a)-[:${relationTypes.arcHasChapter}]->(c)
RETURN c, a
`;

const GET_CHAPTERS = `
MATCH (c:${nodeLabels.chapter})
OPTIONAL MATCH (a:${nodeLabels.arc})-[:${relationTypes.arcHasChapter}]->(c)
WHERE
  ($name IS NULL OR toLower(c.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(c.tags, []))
  AND ($arcId IS NULL OR a.id = $arcId)
RETURN c, a
ORDER BY c.order ASC, c.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_CHAPTERS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("chapter_search", $q) YIELD node, score
WITH node AS c, score
OPTIONAL MATCH (a:${nodeLabels.arc})-[:${relationTypes.arcHasChapter}]->(c)
WHERE
  ($name IS NULL OR toLower(c.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(c.tags, []))
  AND ($arcId IS NULL OR a.id = $arcId)
RETURN c, a
ORDER BY score DESC, c.order ASC, c.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const DELETE_CHAPTER = `
MATCH (c:${nodeLabels.chapter} {id: $id})
WITH c
DETACH DELETE c
RETURN 1 AS deleted
`;

const CHAPTER_PARAMS = [
  "id",
  "name",
  "order",
  "summary",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const CHAPTER_UPDATE_PARAMS = CHAPTER_PARAMS.filter(
  (key) => key !== "createdAt"
);

export const createChapter = async (
  data: ChapterNode,
  database: string
): Promise<ChapterNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, CHAPTER_PARAMS);
    const result = await session.run(CREATE_CHAPTER, params);
    const record = result.records[0];
    const node = record?.get("c");
    return mapNode(node?.properties ?? data) as ChapterNode;
  } finally {
    await session.close();
  }
};

export const createChapterWithArc = async (
  data: ChapterNode,
  database: string,
  arcId: string
): Promise<ChapterNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams({ ...data, arcId }, [...CHAPTER_PARAMS, "arcId"]);
    const result = await session.run(CREATE_CHAPTER_WITH_ARC, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("c");
    return mapNode(node?.properties ?? data) as ChapterNode;
  } finally {
    await session.close();
  }
};

export const updateChapter = async (
  data: ChapterNode,
  database: string
): Promise<ChapterNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, CHAPTER_UPDATE_PARAMS);
    const result = await session.run(UPDATE_CHAPTER, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("c");
    return mapNode(node?.properties ?? data) as ChapterNode;
  } finally {
    await session.close();
  }
};

export const updateChapterWithArc = async (
  data: ChapterNode,
  database: string,
  arcId: string
): Promise<ChapterNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams({ ...data, arcId }, [...CHAPTER_UPDATE_PARAMS, "arcId"]);
    const result = await session.run(UPDATE_CHAPTER_WITH_ARC, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("c");
    return mapNode(node?.properties ?? data) as ChapterNode;
  } finally {
    await session.close();
  }
};

export const getChapters = async (
  database: string,
  query: ChapterListQuery
): Promise<ChapterNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_CHAPTERS_BY_SEARCH : GET_CHAPTERS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
      arcId: query.arcId ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("c");
      const arc = record.get("a");
      return {
        ...(mapNode(node?.properties ?? {}) as ChapterNode),
        arcId: arc?.properties?.id ?? undefined,
      } as ChapterNode;
    });
  } finally {
    await session.close();
  }
};

export const deleteChapter = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_CHAPTER, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};
