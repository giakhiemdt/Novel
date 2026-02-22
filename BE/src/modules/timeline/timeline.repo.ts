import neo4j, { Integer } from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { generateId } from "../../shared/utils/generate-id";
import { mapNode } from "../../shared/utils/map-node";
import {
  LegacyTimelineMigrationResult,
  TimelineListQuery,
  TimelineNode,
} from "./timeline.types";

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

const UPDATE_TIMELINE = `
MATCH (t:${nodeLabels.timeline} {id: $id})
SET
  t.name = $name,
  t.code = $code,
  t.durationYears = $durationYears,
  t.isOngoing = $isOngoing,
  t.summary = $summary,
  t.description = $description,
  t.characteristics = $characteristics,
  t.dominantForces = $dominantForces,
  t.technologyLevel = $technologyLevel,
  t.powerEnvironment = $powerEnvironment,
  t.worldState = $worldState,
  t.majorChanges = $majorChanges,
  t.notes = $notes,
  t.tags = $tags,
  t.updatedAt = $updatedAt
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
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_TIMELINES_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_search", $q) YIELD node, score
WITH node AS t, score
OPTIONAL MATCH (t)-[:${relationTypes.timelinePrevious}]->(p:${nodeLabels.timeline})
OPTIONAL MATCH (t)-[:${relationTypes.timelineNext}]->(n:${nodeLabels.timeline})
WHERE
  ($name IS NULL OR toLower(t.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(t.tags, []))
  AND ($code IS NULL OR t.code = $code)
  AND ($isOngoing IS NULL OR t.isOngoing = $isOngoing)
RETURN t, p, n
ORDER BY score DESC, t.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const COUNT_TIMELINES = `
MATCH (t:${nodeLabels.timeline})
WHERE
  ($name IS NULL OR toLower(t.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(t.tags, []))
  AND ($code IS NULL OR t.code = $code)
  AND ($isOngoing IS NULL OR t.isOngoing = $isOngoing)
RETURN count(t) AS total
`;

const COUNT_TIMELINES_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_search", $q) YIELD node, score
WITH node AS t, score
WHERE
  ($name IS NULL OR toLower(t.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(t.tags, []))
  AND ($code IS NULL OR t.code = $code)
  AND ($isOngoing IS NULL OR t.isOngoing = $isOngoing)
RETURN count(t) AS total
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
const TIMELINE_UPDATE_PARAMS = TIMELINE_PARAMS.filter(
  (key) => key !== "createdAt"
);

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

const ENSURE_LEGACY_MIGRATION_AXIS_ERA = `
MERGE (a:${nodeLabels.timelineAxis} {code: $axisCode})
ON CREATE SET
  a.id = $axisId,
  a.name = $axisName,
  a.axisType = "parallel",
  a.description = $axisDescription,
  a.status = "active",
  a.createdAt = $now,
  a.updatedAt = $now
ON MATCH SET
  a.updatedAt = $now
MERGE (e:${nodeLabels.timelineEra} {code: $eraCode})
ON CREATE SET
  e.id = $eraId,
  e.axisId = a.id,
  e.name = $eraName,
  e.summary = $eraSummary,
  e.order = 0,
  e.status = "active",
  e.createdAt = $now,
  e.updatedAt = $now
ON MATCH SET
  e.axisId = a.id,
  e.updatedAt = $now
MERGE (a)-[:${relationTypes.timelineHasEra}]->(e)
RETURN a.id AS axisId, e.id AS eraId
`;

const COUNT_LEGACY_TIMELINES = `
MATCH (t:${nodeLabels.timeline})
RETURN count(t) AS total
`;

const COUNT_LEGACY_EVENT_LINKS = `
MATCH (:${nodeLabels.event})-[r:${relationTypes.occursOn}]->(:${nodeLabels.timeline})
RETURN count(r) AS total
`;

const COUNT_MIGRATED_SEGMENTS = `
MATCH (s:${nodeLabels.timelineSegment})
WHERE s.legacyTimelineId IS NOT NULL
RETURN count(s) AS total
`;

const COUNT_MIGRATED_MARKERS = `
MATCH (m:${nodeLabels.timelineMarker})
WHERE m.legacyEventId IS NOT NULL
RETURN count(m) AS total
`;

const MIGRATE_LEGACY_TIMELINES_TO_SEGMENTS = `
MATCH (t:${nodeLabels.timeline})
WITH t ORDER BY coalesce(t.createdAt, "") ASC, t.name ASC
WITH collect(t) AS timelines
UNWIND range(0, size(timelines) - 1) AS idx
WITH timelines[idx] AS t, idx
MATCH (e:${nodeLabels.timelineEra} {id: $eraId})
MERGE (s:${nodeLabels.timelineSegment} {legacyTimelineId: t.id})
ON CREATE SET
  s.id = "legacy-segment-" + t.id,
  s.createdAt = $now,
  s.status = "active"
SET
  s.axisId = $axisId,
  s.eraId = $eraId,
  s.name = coalesce(t.name, "Legacy timeline"),
  s.code = t.code,
  s.summary = t.summary,
  s.description = t.description,
  s.order = idx,
  s.startTick = 0,
  s.endTick = coalesce(t.durationYears, 0),
  s.notes = t.notes,
  s.tags = coalesce(t.tags, []),
  s.updatedAt = $now
MERGE (e)-[:${relationTypes.timelineHasSegment}]->(s)
RETURN count(t) AS migrated
`;

const MIGRATE_LEGACY_EVENT_LINKS_TO_MARKERS = `
MATCH (ev:${nodeLabels.event})-[on:${relationTypes.occursOn}]->(t:${nodeLabels.timeline})
MATCH (s:${nodeLabels.timelineSegment} {legacyTimelineId: t.id})
MERGE (m:${nodeLabels.timelineMarker} {legacyEventId: ev.id})
ON CREATE SET
  m.id = "legacy-marker-" + ev.id,
  m.createdAt = $now,
  m.status = "active"
SET
  m.axisId = s.axisId,
  m.eraId = s.eraId,
  m.segmentId = s.id,
  m.label = coalesce(ev.name, t.name, "Legacy marker"),
  m.tick = coalesce(on.year, 0),
  m.markerType = "event",
  m.description = coalesce(ev.summary, m.description),
  m.eventRefId = ev.id,
  m.updatedAt = $now
WITH s, m
OPTIONAL MATCH (other:${nodeLabels.timelineSegment})-[oldRel:${relationTypes.timelineHasMarker}]->(m)
WHERE other.id <> s.id
DELETE oldRel
WITH s, m
MERGE (s)-[:${relationTypes.timelineHasMarker}]->(m)
RETURN count(on) AS migrated
`;

const MIGRATE_WORLD_RULE_TIMELINE_IDS = `
MATCH (r:${nodeLabels.worldRule})
WITH r, coalesce(r.timelineIds, []) AS timelineIds
WITH
  r,
  timelineIds,
  [timelineId IN timelineIds |
    coalesce(
      head([(s:${nodeLabels.timelineSegment} {legacyTimelineId: timelineId}) | s.id]),
      timelineId
    )
  ] AS mapped
WHERE mapped <> timelineIds
SET r.timelineIds = mapped,
    r.updatedAt = $now
RETURN count(r) AS updated
`;

const COUNT_UNRESOLVED_LEGACY_EVENT_LINKS = `
MATCH (ev:${nodeLabels.event})-[:${relationTypes.occursOn}]->(:${nodeLabels.timeline})
WHERE NOT EXISTS {
  MATCH (m:${nodeLabels.timelineMarker} {eventRefId: ev.id})
}
RETURN count(ev) AS total
`;

const DELETE_LEGACY_OCCURS_ON = `
MATCH (:${nodeLabels.event})-[r:${relationTypes.occursOn}]->(:${nodeLabels.timeline})
DELETE r
RETURN count(r) AS deleted
`;

const DELETE_ALL_LEGACY_TIMELINES = `
MATCH (t:${nodeLabels.timeline})
WITH collect(t) AS timelines
UNWIND timelines AS t
DETACH DELETE t
RETURN size(timelines) AS deleted
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
    const statement = query.q ? GET_TIMELINES_BY_SEARCH : GET_TIMELINES;
    const result = await session.run(statement, {
      q: query.q ?? "",
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

export const updateTimeline = async (
  data: Omit<TimelineNode, "previousId" | "nextId" | "createdAt"> & {
    id: string;
    updatedAt: string;
  },
  database: string
): Promise<Omit<TimelineNode, "previousId" | "nextId"> | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, TIMELINE_UPDATE_PARAMS);
    const result = await session.run(UPDATE_TIMELINE, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("t");
    return mapNode(node?.properties ?? data) as TimelineNode;
  } finally {
    await session.close();
  }
};

export const getTimelineCount = async (
  database: string,
  query: TimelineListQuery
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? COUNT_TIMELINES_BY_SEARCH : COUNT_TIMELINES;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
      code: query.code ?? null,
      isOngoing:
        typeof query.isOngoing === "boolean" ? query.isOngoing : null,
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

const getNumber = (value: unknown): number => {
  if (neo4j.isInt(value)) {
    return value.toNumber();
  }
  return typeof value === "number" ? value : 0;
};

export const migrateLegacyTimelinesToTimelineFirst = async (
  database: string,
  options?: { deleteLegacy?: boolean }
): Promise<LegacyTimelineMigrationResult> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  const deleteLegacy = options?.deleteLegacy ?? true;
  try {
    return await session.executeWrite(async (tx) => {
      const now = new Date().toISOString();
      const ensured = await tx.run(ENSURE_LEGACY_MIGRATION_AXIS_ERA, {
        axisCode: "__legacy_timeline_axis__",
        axisId: generateId(),
        axisName: "Legacy timeline axis",
        axisDescription: "Auto-generated axis for migrated legacy timeline nodes.",
        eraCode: "__legacy_timeline_era__",
        eraId: generateId(),
        eraName: "Legacy timeline era",
        eraSummary: "Auto-generated era that stores converted legacy timeline segments.",
        now,
      });
      const axisId = ensured.records[0]?.get("axisId") as string;
      const eraId = ensured.records[0]?.get("eraId") as string;

      const legacyTimelinesBefore = await tx.run(COUNT_LEGACY_TIMELINES);
      const segmentsBefore = await tx.run(COUNT_MIGRATED_SEGMENTS);
      const markersBefore = await tx.run(COUNT_MIGRATED_MARKERS);
      const legacyLinksBefore = await tx.run(COUNT_LEGACY_EVENT_LINKS);

      await tx.run(MIGRATE_LEGACY_TIMELINES_TO_SEGMENTS, { axisId, eraId, now });
      await tx.run(MIGRATE_LEGACY_EVENT_LINKS_TO_MARKERS, { now });
      const worldRulesUpdatedResult = await tx.run(MIGRATE_WORLD_RULE_TIMELINE_IDS, {
        now,
      });

      const segmentsAfter = await tx.run(COUNT_MIGRATED_SEGMENTS);
      const markersAfter = await tx.run(COUNT_MIGRATED_MARKERS);
      const unresolvedAfter = await tx.run(COUNT_UNRESOLVED_LEGACY_EVENT_LINKS);

      const timelinesFound = getNumber(legacyTimelinesBefore.records[0]?.get("total"));
      const legacyEventLinksFound = getNumber(legacyLinksBefore.records[0]?.get("total"));
      const segmentsTotal = getNumber(segmentsAfter.records[0]?.get("total"));
      const markersTotal = getNumber(markersAfter.records[0]?.get("total"));
      const unresolvedLegacyEventLinks = getNumber(
        unresolvedAfter.records[0]?.get("total")
      );
      const segmentsCreated =
        segmentsTotal - getNumber(segmentsBefore.records[0]?.get("total"));
      const markersCreated =
        markersTotal - getNumber(markersBefore.records[0]?.get("total"));
      const worldRulesUpdated = getNumber(worldRulesUpdatedResult.records[0]?.get("updated"));

      let deletedOccursOnRelations = 0;
      let deletedTimelines = 0;
      let deletedLegacyTimelineNodes = false;

      if (deleteLegacy && unresolvedLegacyEventLinks === 0) {
        const deletedOccursOnResult = await tx.run(DELETE_LEGACY_OCCURS_ON);
        const deletedTimelinesResult = await tx.run(DELETE_ALL_LEGACY_TIMELINES);
        deletedOccursOnRelations = getNumber(
          deletedOccursOnResult.records[0]?.get("deleted")
        );
        deletedTimelines = getNumber(deletedTimelinesResult.records[0]?.get("deleted"));
        deletedLegacyTimelineNodes = true;
      }

      return {
        axisId,
        eraId,
        timelinesFound,
        segmentsCreated: Math.max(0, segmentsCreated),
        segmentsTotal,
        legacyEventLinksFound,
        markersCreated: Math.max(0, markersCreated),
        markersTotal,
        worldRulesUpdated,
        unresolvedLegacyEventLinks,
        deletedOccursOnRelations,
        deletedTimelines,
        deletedLegacyTimelineNodes,
      };
    });
  } finally {
    await session.close();
  }
};
