import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { SceneNode } from "./scene.types";

const CREATE_SCENE = `
CREATE (s:${nodeLabels.scene} {
  id: $id,
  name: $name,
  order: $order,
  summary: $summary,
  content: $content,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN s
`;

const UPDATE_SCENE = `
MATCH (s:${nodeLabels.scene} {id: $id})
SET
  s.name = $name,
  s.order = $order,
  s.summary = $summary,
  s.content = $content,
  s.notes = $notes,
  s.tags = $tags,
  s.updatedAt = $updatedAt
RETURN s
`;

const GET_SCENES = `
MATCH (s:${nodeLabels.scene})
OPTIONAL MATCH (c:${nodeLabels.chapter})-[:${relationTypes.chapterHasScene}]->(s)
OPTIONAL MATCH (s)-[:${relationTypes.sceneReferencesEvent}]->(e:${nodeLabels.event})
OPTIONAL MATCH (s)-[:${relationTypes.sceneTakesPlaceIn}]->(l:${nodeLabels.location})
OPTIONAL MATCH (s)-[:${relationTypes.sceneFeaturesCharacter}]->(ch:${nodeLabels.character})
RETURN s, c, e, l, collect(ch.id) AS characterIds
ORDER BY s.order ASC, s.createdAt DESC
`;

const DELETE_SCENE = `
MATCH (s:${nodeLabels.scene} {id: $id})
WITH s
DETACH DELETE s
RETURN 1 AS deleted
`;

const CHECK_CHAPTER = `
MATCH (c:${nodeLabels.chapter} {id: $id})
RETURN c IS NOT NULL AS exists
`;

const CHECK_EVENT = `
MATCH (e:${nodeLabels.event} {id: $id})
RETURN e IS NOT NULL AS exists
`;

const CHECK_LOCATION = `
MATCH (l:${nodeLabels.location} {id: $id})
RETURN l IS NOT NULL AS exists
`;

const GET_CHARACTER_IDS = `
UNWIND $ids AS id
MATCH (c:${nodeLabels.character} {id: id})
RETURN collect(c.id) AS ids
`;

const LINK_SCENE_CHAPTER = `
MATCH (c:${nodeLabels.chapter} {id: $chapterId})
MATCH (s:${nodeLabels.scene} {id: $sceneId})
MERGE (c)-[:${relationTypes.chapterHasScene}]->(s)
`;

const UNLINK_SCENE_CHAPTER = `
MATCH (c:${nodeLabels.chapter})-[r:${relationTypes.chapterHasScene}]->(s:${nodeLabels.scene} {id: $sceneId})
DELETE r
`;

const LINK_SCENE_EVENT = `
MATCH (e:${nodeLabels.event} {id: $eventId})
MATCH (s:${nodeLabels.scene} {id: $sceneId})
MERGE (s)-[:${relationTypes.sceneReferencesEvent}]->(e)
`;

const UNLINK_SCENE_EVENT = `
MATCH (s:${nodeLabels.scene} {id: $sceneId})-[r:${relationTypes.sceneReferencesEvent}]->(:${nodeLabels.event})
DELETE r
`;

const LINK_SCENE_LOCATION = `
MATCH (l:${nodeLabels.location} {id: $locationId})
MATCH (s:${nodeLabels.scene} {id: $sceneId})
MERGE (s)-[:${relationTypes.sceneTakesPlaceIn}]->(l)
`;

const UNLINK_SCENE_LOCATION = `
MATCH (s:${nodeLabels.scene} {id: $sceneId})-[r:${relationTypes.sceneTakesPlaceIn}]->(:${nodeLabels.location})
DELETE r
`;

const UNLINK_SCENE_CHARACTERS = `
MATCH (s:${nodeLabels.scene} {id: $sceneId})-[r:${relationTypes.sceneFeaturesCharacter}]->(:${nodeLabels.character})
DELETE r
`;

const LINK_SCENE_CHARACTERS = `
MATCH (s:${nodeLabels.scene} {id: $sceneId})
UNWIND $characterIds AS characterId
MATCH (c:${nodeLabels.character} {id: characterId})
MERGE (s)-[:${relationTypes.sceneFeaturesCharacter}]->(c)
RETURN count(c) AS linked
`;

const SCENE_PARAMS = [
  "id",
  "name",
  "order",
  "summary",
  "content",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const SCENE_UPDATE_PARAMS = SCENE_PARAMS.filter((key) => key !== "createdAt");

export const createScene = async (
  data: SceneNode,
  database: string
): Promise<SceneNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, SCENE_PARAMS);
    const result = await session.run(CREATE_SCENE, params);
    const record = result.records[0];
    const node = record?.get("s");
    return mapNode(node?.properties ?? data) as SceneNode;
  } finally {
    await session.close();
  }
};

export const updateScene = async (
  data: SceneNode,
  database: string
): Promise<SceneNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, SCENE_UPDATE_PARAMS);
    const result = await session.run(UPDATE_SCENE, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("s");
    return mapNode(node?.properties ?? data) as SceneNode;
  } finally {
    await session.close();
  }
};

export const getScenes = async (database: string): Promise<SceneNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_SCENES);
    return result.records.map((record) => {
      const node = record.get("s");
      const chapter = record.get("c");
      const event = record.get("e");
      const location = record.get("l");
      const characterIds = record.get("characterIds") as string[] | undefined;
      return {
        ...(mapNode(node?.properties ?? {}) as SceneNode),
        chapterId: chapter?.properties?.id ?? undefined,
        eventId: event?.properties?.id ?? undefined,
        locationId: location?.properties?.id ?? undefined,
        characterIds: characterIds ?? [],
      } as SceneNode;
    });
  } finally {
    await session.close();
  }
};

export const deleteScene = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_SCENE, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const checkChapterExists = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHECK_CHAPTER, { id });
    return (result.records[0]?.get("exists") as boolean | undefined) ?? false;
  } finally {
    await session.close();
  }
};

export const checkEventExists = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHECK_EVENT, { id });
    return (result.records[0]?.get("exists") as boolean | undefined) ?? false;
  } finally {
    await session.close();
  }
};

export const checkLocationExists = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHECK_LOCATION, { id });
    return (result.records[0]?.get("exists") as boolean | undefined) ?? false;
  } finally {
    await session.close();
  }
};

export const getCharacterIds = async (
  database: string,
  ids: string[]
): Promise<string[]> => {
  if (ids.length === 0) {
    return [];
  }
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_CHARACTER_IDS, { ids });
    return (result.records[0]?.get("ids") ?? []) as string[];
  } finally {
    await session.close();
  }
};

export const linkSceneChapter = async (
  database: string,
  sceneId: string,
  chapterId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(LINK_SCENE_CHAPTER, { sceneId, chapterId });
  } finally {
    await session.close();
  }
};

export const unlinkSceneChapter = async (
  database: string,
  sceneId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(UNLINK_SCENE_CHAPTER, { sceneId });
  } finally {
    await session.close();
  }
};

export const linkSceneEvent = async (
  database: string,
  sceneId: string,
  eventId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(LINK_SCENE_EVENT, { sceneId, eventId });
  } finally {
    await session.close();
  }
};

export const unlinkSceneEvent = async (
  database: string,
  sceneId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(UNLINK_SCENE_EVENT, { sceneId });
  } finally {
    await session.close();
  }
};

export const linkSceneLocation = async (
  database: string,
  sceneId: string,
  locationId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(LINK_SCENE_LOCATION, { sceneId, locationId });
  } finally {
    await session.close();
  }
};

export const unlinkSceneLocation = async (
  database: string,
  sceneId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(UNLINK_SCENE_LOCATION, { sceneId });
  } finally {
    await session.close();
  }
};

export const updateSceneCharacters = async (
  database: string,
  sceneId: string,
  characterIds: string[]
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(UNLINK_SCENE_CHARACTERS, { sceneId });
      if (characterIds.length === 0) {
        return;
      }
      await tx.run(LINK_SCENE_CHARACTERS, { sceneId, characterIds });
    });
  } finally {
    await session.close();
  }
};
