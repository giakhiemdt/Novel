import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import {
  ChapterOrphan,
  DeadCharacterConflict,
  EventOverlap,
  SceneOrphan,
} from "./conflict.types";

const OVERLAP_QUERY = `
MATCH (m1:${nodeLabels.timelineMarker})<-[:${relationTypes.timelineHasMarker}]-(s:${nodeLabels.timelineSegment})
WHERE m1.eventRefId IS NOT NULL
MATCH (e1:${nodeLabels.event} {id: m1.eventRefId})
MATCH (m2:${nodeLabels.timelineMarker})<-[:${relationTypes.timelineHasMarker}]-(s)
WHERE m2.eventRefId IS NOT NULL AND m1.id < m2.id
MATCH (e2:${nodeLabels.event} {id: m2.eventRefId})
WITH
  e1,
  e2,
  s,
  coalesce(m1.tick, 0) AS s1,
  coalesce(m2.tick, 0) AS s2,
  CASE
    WHEN coalesce(e1.durationUnit, "YEAR") = "YEAR"
    THEN coalesce(m1.tick, 0) + coalesce(e1.durationValue, 1) - 1
    ELSE coalesce(m1.tick, 0)
  END AS e1y,
  CASE
    WHEN coalesce(e2.durationUnit, "YEAR") = "YEAR"
    THEN coalesce(m2.tick, 0) + coalesce(e2.durationValue, 1) - 1
    ELSE coalesce(m2.tick, 0)
  END AS e2y
WHERE s1 IS NOT NULL AND s2 IS NOT NULL AND e1y >= s2 AND e2y >= s1
RETURN s, e1, e2, s1, e1y, s2, e2y
ORDER BY s.name, s1, s2
`;

const SCENES_WITHOUT_CHAPTER = `
MATCH (s:${nodeLabels.scene})
WHERE NOT ((:${nodeLabels.chapter})-[:${relationTypes.chapterHasScene}]->(s))
RETURN s
ORDER BY s.createdAt DESC
`;

const CHAPTERS_WITHOUT_ARC = `
MATCH (c:${nodeLabels.chapter})
WHERE NOT ((:${nodeLabels.arc})-[:${relationTypes.arcHasChapter}]->(c))
RETURN c
ORDER BY c.createdAt DESC
`;

const DEAD_CHARACTERS_IN_EVENTS = `
MATCH (c:${nodeLabels.character} {status: 'Dead'})-[:${relationTypes.participatesIn}]->(e:${nodeLabels.event})
RETURN c, e
ORDER BY c.name, e.name
`;

export const getEventOverlaps = async (
  database: string
): Promise<EventOverlap[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(OVERLAP_QUERY);
    return result.records.map((record) => {
      const segment = record.get("s");
      const e1 = record.get("e1");
      const e2 = record.get("e2");
      return {
        timelineId: segment?.properties?.id ?? undefined,
        timelineName: segment?.properties?.name ?? undefined,
        eventA: {
          id: e1?.properties?.id ?? "",
          name: e1?.properties?.name ?? "",
          startYear: (record.get("s1") as number) ?? 0,
          endYear: (record.get("e1y") as number) ?? 0,
        },
        eventB: {
          id: e2?.properties?.id ?? "",
          name: e2?.properties?.name ?? "",
          startYear: (record.get("s2") as number) ?? 0,
          endYear: (record.get("e2y") as number) ?? 0,
        },
      };
    });
  } finally {
    await session.close();
  }
};

export const getScenesWithoutChapter = async (
  database: string
): Promise<SceneOrphan[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(SCENES_WITHOUT_CHAPTER);
    return result.records.map((record) => {
      const node = record.get("s");
      return {
        id: node?.properties?.id ?? "",
        name: node?.properties?.name ?? "",
      };
    });
  } finally {
    await session.close();
  }
};

export const getChaptersWithoutArc = async (
  database: string
): Promise<ChapterOrphan[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHAPTERS_WITHOUT_ARC);
    return result.records.map((record) => {
      const node = record.get("c");
      return {
        id: node?.properties?.id ?? "",
        name: node?.properties?.name ?? "",
      };
    });
  } finally {
    await session.close();
  }
};

export const getDeadCharactersInEvents = async (
  database: string
): Promise<DeadCharacterConflict[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(DEAD_CHARACTERS_IN_EVENTS);
    return result.records.map((record) => {
      const character = record.get("c");
      const event = record.get("e");
      return {
        character: {
          id: character?.properties?.id ?? "",
          name: character?.properties?.name ?? "",
        },
        event: {
          id: event?.properties?.id ?? "",
          name: event?.properties?.name ?? "",
        },
      };
    });
  } finally {
    await session.close();
  }
};
