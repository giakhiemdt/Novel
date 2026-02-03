import neo4j, { Integer } from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { TimelineListQuery, TimelineNode } from "./timeline.types";

const CREATE_TIMELINE = `
CREATE (t:${nodeLabels.timeline} {
  id: $id,
  name: $name,
  code: $code,
  durationYears: $durationYears,
  isOngoing: $isOngoing,
  summary: $summary,
  description: $description,
  characteristics: $characteristics,
  dominantForces: $dominantForces,
  technologyLevel: $technologyLevel,
  powerEnvironment: $powerEnvironment,
  worldState: $worldState,
  majorChanges: $majorChanges,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN t
`;

const GET_TIMELINES = `
MATCH (t:${nodeLabels.timeline})
OPTIONAL MATCH (t)-[:${relationTypes.timelinePrevious}]->(p:${nodeLabels.timeline})
OPTIONAL MATCH (t)-[:${relationTypes.timelineNext}]->(n:${nodeLabels.timeline})
WHERE
  ($name IS NULL OR toLower(t.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(t.tags, []))
  AND ($code IS NULL OR t.code = $code)
  AND ($isOngoing IS NULL OR t.isOngoing = $isOngoing)
RETURN t, p, n
ORDER BY t.createdAt DESC
SKIP $offset
LIMIT $limit
`;

const TIMELINE_PARAMS = [
  "id",
  "name",
  "code",
  "durationYears",
  "isOngoing",
  "summary",
  "description",
  "characteristics",
  "dominantForces",
  "technologyLevel",
  "powerEnvironment",
  "worldState",
  "majorChanges",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const CHECK_NEXT = `
MATCH (t:${nodeLabels.timeline} {id: $id})
OPTIONAL MATCH (t)-[:${relationTypes.timelineNext}]->(n:${nodeLabels.timeline})
RETURN t IS NOT NULL AS exists, count(n) AS nextCount
`;

const CHECK_PREVIOUS = `
MATCH (t:${nodeLabels.timeline} {id: $id})
OPTIONAL MATCH (t)-[:${relationTypes.timelinePrevious}]->(p:${nodeLabels.timeline})
RETURN t IS NOT NULL AS exists, count(p) AS prevCount
`;

const LINK_PREVIOUS = `
MATCH (prev:${nodeLabels.timeline} {id: $previousId})
MATCH (current:${nodeLabels.timeline} {id: $currentId})
MERGE (prev)-[:${relationTypes.timelineNext}]->(current)
MERGE (current)-[:${relationTypes.timelinePrevious}]->(prev)
`;

const LINK_NEXT = `
MATCH (current:${nodeLabels.timeline} {id: $currentId})
MATCH (next:${nodeLabels.timeline} {id: $nextId})
MERGE (current)-[:${relationTypes.timelineNext}]->(next)
MERGE (next)-[:${relationTypes.timelinePrevious}]->(current)
`;

const CHECK_EXISTS = `
MATCH (t:${nodeLabels.timeline} {id: $id})
RETURN t IS NOT NULL AS exists
`;

const UNLINK_PREVIOUS_ANY = `
MATCH (prev:${nodeLabels.timeline})-[r1:${relationTypes.timelineNext}]->(current:${nodeLabels.timeline} {id: $currentId})
MATCH (current)-[r2:${relationTypes.timelinePrevious}]->(prev)
DELETE r1, r2
`;

const UNLINK_PREVIOUS_BY_ID = `
MATCH (prev:${nodeLabels.timeline} {id: $previousId})-[r1:${relationTypes.timelineNext}]->(current:${nodeLabels.timeline} {id: $currentId})
MATCH (current)-[r2:${relationTypes.timelinePrevious}]->(prev)
DELETE r1, r2
`;

const UNLINK_NEXT_ANY = `
MATCH (current:${nodeLabels.timeline} {id: $currentId})-[r1:${relationTypes.timelineNext}]->(next:${nodeLabels.timeline})
MATCH (next)-[r2:${relationTypes.timelinePrevious}]->(current)
DELETE r1, r2
`;

const UNLINK_NEXT_BY_ID = `
MATCH (current:${nodeLabels.timeline} {id: $currentId})-[r1:${relationTypes.timelineNext}]->(next:${nodeLabels.timeline} {id: $nextId})
MATCH (next)-[r2:${relationTypes.timelinePrevious}]->(current)
DELETE r1, r2
`;

const DELETE_TIMELINE = `
MATCH (t:${nodeLabels.timeline} {id: $id})
WITH t
DETACH DELETE t
RETURN 1 AS deleted
`;

export const createTimeline = async (
  data: Omit<TimelineNode, "previousId" | "nextId">,
  database: string,
  previousId?: string,
  nextId?: string
): Promise<Omit<TimelineNode, "previousId" | "nextId">> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.executeWrite(async (tx) => {
      const params = buildParams(data, TIMELINE_PARAMS);
      const created = await tx.run(CREATE_TIMELINE, params);
      const record = created.records[0];
      const node = record?.get("t");

      if (previousId) {
        const check = await tx.run(CHECK_NEXT, { id: previousId });
        const exists = check.records[0]?.get("exists") as boolean | undefined;
        const nextCount = check.records[0]?.get("nextCount") as Integer | undefined;
        if (!exists) {
          throw new Error("PREVIOUS timeline not found");
        }
        if (nextCount && nextCount.toNumber() > 0) {
          throw new Error("PREVIOUS timeline already has NEXT");
        }
        await tx.run(LINK_PREVIOUS, { previousId, currentId: data.id });
      }

      if (nextId) {
        const check = await tx.run(CHECK_PREVIOUS, { id: nextId });
        const exists = check.records[0]?.get("exists") as boolean | undefined;
        const prevCount = check.records[0]?.get("prevCount") as Integer | undefined;
        if (!exists) {
          throw new Error("NEXT timeline not found");
        }
        if (prevCount && prevCount.toNumber() > 0) {
          throw new Error("NEXT timeline already has PREVIOUS");
        }
        await tx.run(LINK_NEXT, { nextId, currentId: data.id });
      }

      return mapNode(node?.properties ?? data) as TimelineNode;
    });

    return result;
  } finally {
    await session.close();
  }
};

export const getTimelines = async (
  database: string,
  query: TimelineListQuery
): Promise<TimelineNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_TIMELINES, {
      name: query.name ?? null,
      tag: query.tag ?? null,
      code: query.code ?? null,
      isOngoing:
        typeof query.isOngoing === "boolean" ? query.isOngoing : null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("t");
      const previous = record.get("p");
      const next = record.get("n");
      return {
        ...(mapNode(node?.properties ?? {}) as TimelineNode),
        previousId: previous?.properties?.id ?? undefined,
        nextId: next?.properties?.id ?? undefined,
      } as TimelineNode;
    });
  } finally {
    await session.close();
  }
};

export const linkTimeline = async (
  database: string,
  currentId: string,
  previousId?: string,
  nextId?: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.executeWrite(async (tx) => {
      const currentCheck = await tx.run(CHECK_EXISTS, { id: currentId });
      const currentExists = currentCheck.records[0]?.get("exists") as boolean | undefined;
      if (!currentExists) {
        throw new Error("CURRENT timeline not found");
      }

      if (previousId) {
        const prevCheck = await tx.run(CHECK_NEXT, { id: previousId });
        const prevExists = prevCheck.records[0]?.get("exists") as boolean | undefined;
        const prevNextCount = prevCheck.records[0]?.get("nextCount") as Integer | undefined;
        if (!prevExists) {
          throw new Error("PREVIOUS timeline not found");
        }
        if (prevNextCount && prevNextCount.toNumber() > 0) {
          throw new Error("PREVIOUS timeline already has NEXT");
        }

        const currentPrevCheck = await tx.run(CHECK_PREVIOUS, { id: currentId });
        const currentPrevCount = currentPrevCheck.records[0]?.get("prevCount") as
          | Integer
          | undefined;
        if (currentPrevCount && currentPrevCount.toNumber() > 0) {
          throw new Error("CURRENT timeline already has PREVIOUS");
        }

        await tx.run(LINK_PREVIOUS, { previousId, currentId });
      }

      if (nextId) {
        const nextCheck = await tx.run(CHECK_PREVIOUS, { id: nextId });
        const nextExists = nextCheck.records[0]?.get("exists") as boolean | undefined;
        const nextPrevCount = nextCheck.records[0]?.get("prevCount") as Integer | undefined;
        if (!nextExists) {
          throw new Error("NEXT timeline not found");
        }
        if (nextPrevCount && nextPrevCount.toNumber() > 0) {
          throw new Error("NEXT timeline already has PREVIOUS");
        }

        const currentNextCheck = await tx.run(CHECK_NEXT, { id: currentId });
        const currentNextCount = currentNextCheck.records[0]?.get("nextCount") as
          | Integer
          | undefined;
        if (currentNextCount && currentNextCount.toNumber() > 0) {
          throw new Error("CURRENT timeline already has NEXT");
        }

        await tx.run(LINK_NEXT, { nextId, currentId });
      }
    });
  } finally {
    await session.close();
  }
};

export const unlinkTimeline = async (
  database: string,
  currentId: string,
  previousId?: string,
  nextId?: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.executeWrite(async (tx) => {
      const currentCheck = await tx.run(CHECK_EXISTS, { id: currentId });
      const currentExists = currentCheck.records[0]?.get("exists") as boolean | undefined;
      if (!currentExists) {
        throw new Error("CURRENT timeline not found");
      }

      if (previousId) {
        await tx.run(UNLINK_PREVIOUS_BY_ID, { currentId, previousId });
      } else {
        await tx.run(UNLINK_PREVIOUS_ANY, { currentId });
      }

      if (nextId) {
        await tx.run(UNLINK_NEXT_BY_ID, { currentId, nextId });
      } else {
        await tx.run(UNLINK_NEXT_ANY, { currentId });
      }
    });
  } finally {
    await session.close();
  }
};

export const deleteTimeline = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_TIMELINE, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};
