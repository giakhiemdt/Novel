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
MATCH (e1:${nodeLabels.event})-[r1:${relationTypes.occursOn}]->(t:${nodeLabels.timeline})<-[:${relationTypes.occursOn}]-(e2:${nodeLabels.event})
WHERE id(e1) < id(e2)
WITH e1, e2, t, r1, startYear1: r1.year,
  endYear1: CASE r1.durationUnit WHEN 'YEAR' THEN r1.year + r1.durationValue - 1 ELSE r1.year END
MATCH (e2)-[r2:${relationTypes.occursOn}]->(t)
WITH e1, e2, t,
  startYear1 AS s1,
  endYear1 AS e1y,
  r2.year AS s2,
  CASE r2.durationUnit WHEN 'YEAR' THEN r2.year + r2.durationValue - 1 ELSE r2.year END AS e2y
WHERE s1 IS NOT NULL AND s2 IS NOT NULL AND e1y >= s2 AND e2y >= s1
RETURN t, e1, e2, s1, e1y, s2, e2y
ORDER BY t.name, s1, s2
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
      const timeline = record.get("t");
      const e1 = record.get("e1");
      const e2 = record.get("e2");
      return {
        timelineId: timeline?.properties?.id ?? undefined,
        timelineName: timeline?.properties?.name ?? undefined,
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
