import neo4j, { ManagedTransaction } from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import {
  TimelineSnapshotQuery,
  TimelineStateChangeListQuery,
  TimelineStateChangeNode,
  TimelineSubjectType,
} from "./timeline-state-change.types";

type TimelineMarkerRefs = {
  id: string;
  axisId: string;
  eraId?: string;
  segmentId?: string;
};

const subjectTypeToLabel: Record<TimelineSubjectType, string> = {
  project: nodeLabels.project,
  overview: nodeLabels.overview,
  character: nodeLabels.character,
  race: nodeLabels.race,
  rank: nodeLabels.rank,
  rankSystem: nodeLabels.rankSystem,
  mapSystem: nodeLabels.mapSystem,
  specialAbility: nodeLabels.specialAbility,
  event: nodeLabels.event,
  faction: nodeLabels.faction,
  timeline: nodeLabels.timeline,
  timelineAxis: nodeLabels.timelineAxis,
  timelineEra: nodeLabels.timelineEra,
  timelineSegment: nodeLabels.timelineSegment,
  timelineMarker: nodeLabels.timelineMarker,
  location: nodeLabels.location,
  arc: nodeLabels.arc,
  chapter: nodeLabels.chapter,
  scene: nodeLabels.scene,
  item: nodeLabels.item,
  worldRule: nodeLabels.worldRule,
  relationshipType: nodeLabels.relationshipType,
  energyType: nodeLabels.energyType,
  energyTier: nodeLabels.energyTier,
};

const CREATE_TIMELINE_STATE_CHANGE = `
CREATE (c:${nodeLabels.timelineStateChange} {
  id: $id,
  axisId: $axisId,
  eraId: $eraId,
  segmentId: $segmentId,
  markerId: $markerId,
  eventId: $eventId,
  subjectType: $subjectType,
  subjectId: $subjectId,
  fieldPath: $fieldPath,
  changeType: $changeType,
  oldValue: $oldValue,
  newValue: $newValue,
  effectiveTick: $effectiveTick,
  detail: $detail,
  notes: $notes,
  tags: $tags,
  status: $status,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN c
`;

const UPDATE_TIMELINE_STATE_CHANGE = `
MATCH (c:${nodeLabels.timelineStateChange} {id: $id})
SET
  c.axisId = $axisId,
  c.eraId = $eraId,
  c.segmentId = $segmentId,
  c.markerId = $markerId,
  c.eventId = $eventId,
  c.subjectType = $subjectType,
  c.subjectId = $subjectId,
  c.fieldPath = $fieldPath,
  c.changeType = $changeType,
  c.oldValue = $oldValue,
  c.newValue = $newValue,
  c.effectiveTick = $effectiveTick,
  c.detail = $detail,
  c.notes = $notes,
  c.tags = $tags,
  c.status = $status,
  c.updatedAt = $updatedAt
RETURN c
`;

const GET_TIMELINE_STATE_CHANGES = `
MATCH (c:${nodeLabels.timelineStateChange})
WHERE
  ($axisId IS NULL OR c.axisId = $axisId)
  AND ($eraId IS NULL OR c.eraId = $eraId)
  AND ($segmentId IS NULL OR c.segmentId = $segmentId)
  AND ($markerId IS NULL OR c.markerId = $markerId)
  AND ($eventId IS NULL OR c.eventId = $eventId)
  AND ($subjectType IS NULL OR c.subjectType = $subjectType)
  AND ($subjectId IS NULL OR c.subjectId = $subjectId)
  AND ($fieldPath IS NULL OR toLower(c.fieldPath) CONTAINS toLower($fieldPath))
  AND ($status IS NULL OR c.status = $status)
  AND ($tickFrom IS NULL OR c.effectiveTick >= $tickFrom)
  AND ($tickTo IS NULL OR c.effectiveTick <= $tickTo)
RETURN c
ORDER BY c.effectiveTick ASC, c.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_TIMELINE_STATE_CHANGES_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_state_change_search", $q) YIELD node, score
WITH node AS c, score
WHERE
  ($axisId IS NULL OR c.axisId = $axisId)
  AND ($eraId IS NULL OR c.eraId = $eraId)
  AND ($segmentId IS NULL OR c.segmentId = $segmentId)
  AND ($markerId IS NULL OR c.markerId = $markerId)
  AND ($eventId IS NULL OR c.eventId = $eventId)
  AND ($subjectType IS NULL OR c.subjectType = $subjectType)
  AND ($subjectId IS NULL OR c.subjectId = $subjectId)
  AND ($fieldPath IS NULL OR toLower(c.fieldPath) CONTAINS toLower($fieldPath))
  AND ($status IS NULL OR c.status = $status)
  AND ($tickFrom IS NULL OR c.effectiveTick >= $tickFrom)
  AND ($tickTo IS NULL OR c.effectiveTick <= $tickTo)
RETURN c
ORDER BY score DESC, c.effectiveTick ASC, c.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const COUNT_TIMELINE_STATE_CHANGES = `
MATCH (c:${nodeLabels.timelineStateChange})
WHERE
  ($axisId IS NULL OR c.axisId = $axisId)
  AND ($eraId IS NULL OR c.eraId = $eraId)
  AND ($segmentId IS NULL OR c.segmentId = $segmentId)
  AND ($markerId IS NULL OR c.markerId = $markerId)
  AND ($eventId IS NULL OR c.eventId = $eventId)
  AND ($subjectType IS NULL OR c.subjectType = $subjectType)
  AND ($subjectId IS NULL OR c.subjectId = $subjectId)
  AND ($fieldPath IS NULL OR toLower(c.fieldPath) CONTAINS toLower($fieldPath))
  AND ($status IS NULL OR c.status = $status)
  AND ($tickFrom IS NULL OR c.effectiveTick >= $tickFrom)
  AND ($tickTo IS NULL OR c.effectiveTick <= $tickTo)
RETURN count(c) AS total
`;

const COUNT_TIMELINE_STATE_CHANGES_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_state_change_search", $q) YIELD node, score
WITH node AS c, score
WHERE
  ($axisId IS NULL OR c.axisId = $axisId)
  AND ($eraId IS NULL OR c.eraId = $eraId)
  AND ($segmentId IS NULL OR c.segmentId = $segmentId)
  AND ($markerId IS NULL OR c.markerId = $markerId)
  AND ($eventId IS NULL OR c.eventId = $eventId)
  AND ($subjectType IS NULL OR c.subjectType = $subjectType)
  AND ($subjectId IS NULL OR c.subjectId = $subjectId)
  AND ($fieldPath IS NULL OR toLower(c.fieldPath) CONTAINS toLower($fieldPath))
  AND ($status IS NULL OR c.status = $status)
  AND ($tickFrom IS NULL OR c.effectiveTick >= $tickFrom)
  AND ($tickTo IS NULL OR c.effectiveTick <= $tickTo)
RETURN count(c) AS total
`;

const GET_TIMELINE_STATE_SNAPSHOT = `
MATCH (c:${nodeLabels.timelineStateChange})
WHERE
  c.axisId = $axisId
  AND c.effectiveTick <= $tick
  AND c.status = "active"
  AND ($subjectType IS NULL OR c.subjectType = $subjectType)
  AND ($subjectId IS NULL OR c.subjectId = $subjectId)
WITH c
ORDER BY c.effectiveTick DESC, c.updatedAt DESC
WITH c.subjectType AS groupedSubjectType, c.subjectId AS groupedSubjectId, c.fieldPath AS groupedFieldPath, collect(c)[0] AS latest
RETURN latest AS c
ORDER BY groupedSubjectType ASC, groupedSubjectId ASC, groupedFieldPath ASC
`;

const DELETE_TIMELINE_STATE_CHANGE = `
MATCH (c:${nodeLabels.timelineStateChange} {id: $id})
WITH c
DETACH DELETE c
RETURN 1 AS deleted
`;

const CHECK_TIMELINE_AXIS = `
MATCH (a:${nodeLabels.timelineAxis} {id: $id})
RETURN a IS NOT NULL AS exists
`;

const CHECK_EVENT_EXISTS = `
MATCH (e:${nodeLabels.event} {id: $id})
RETURN e IS NOT NULL AS exists
`;

const GET_TIMELINE_MARKER = `
MATCH (m:${nodeLabels.timelineMarker} {id: $id})
RETURN m
`;

const LINK_MARKER_TO_STATE_CHANGE = `
MATCH (m:${nodeLabels.timelineMarker} {id: $markerId})
MATCH (c:${nodeLabels.timelineStateChange} {id: $stateChangeId})
MERGE (m)-[:${relationTypes.eventCausesChange}]->(c)
`;

const UNLINK_MARKER_FROM_STATE_CHANGE = `
MATCH (:${nodeLabels.timelineMarker})-[r:${relationTypes.eventCausesChange}]->(c:${nodeLabels.timelineStateChange} {id: $stateChangeId})
DELETE r
`;

const LINK_EVENT_TO_STATE_CHANGE = `
MATCH (e:${nodeLabels.event} {id: $eventId})
MATCH (c:${nodeLabels.timelineStateChange} {id: $stateChangeId})
MERGE (e)-[:${relationTypes.eventCausesChange}]->(c)
`;

const UNLINK_EVENT_FROM_STATE_CHANGE = `
MATCH (:${nodeLabels.event})-[r:${relationTypes.eventCausesChange}]->(c:${nodeLabels.timelineStateChange} {id: $stateChangeId})
DELETE r
`;

const UNLINK_APPLIES_TO = `
MATCH (c:${nodeLabels.timelineStateChange} {id: $stateChangeId})-[r:${relationTypes.changeAppliesTo}]->()
DELETE r
`;

const STATE_CHANGE_PARAMS = [
  "id",
  "axisId",
  "eraId",
  "segmentId",
  "markerId",
  "eventId",
  "subjectType",
  "subjectId",
  "fieldPath",
  "changeType",
  "oldValue",
  "newValue",
  "effectiveTick",
  "detail",
  "notes",
  "tags",
  "status",
  "createdAt",
  "updatedAt",
];

const STATE_CHANGE_UPDATE_PARAMS = STATE_CHANGE_PARAMS.filter(
  (key) => key !== "createdAt"
);

const getSubjectLabel = (subjectType: TimelineSubjectType): string =>
  subjectTypeToLabel[subjectType];

const buildCheckSubjectExistsStatement = (subjectType: TimelineSubjectType): string => `
MATCH (n:${getSubjectLabel(subjectType)} {id: $id})
RETURN n IS NOT NULL AS exists
`;

const buildLinkAppliesToStatement = (subjectType: TimelineSubjectType): string => `
MATCH (c:${nodeLabels.timelineStateChange} {id: $stateChangeId})
MATCH (subject:${getSubjectLabel(subjectType)} {id: $subjectId})
MERGE (c)-[:${relationTypes.changeAppliesTo}]->(subject)
`;

const syncStateChangeRelations = async (
  tx: ManagedTransaction,
  data: TimelineStateChangeNode
): Promise<void> => {
  await tx.run(UNLINK_MARKER_FROM_STATE_CHANGE, { stateChangeId: data.id });
  if (data.markerId) {
    await tx.run(LINK_MARKER_TO_STATE_CHANGE, {
      markerId: data.markerId,
      stateChangeId: data.id,
    });
  }

  await tx.run(UNLINK_EVENT_FROM_STATE_CHANGE, { stateChangeId: data.id });
  if (data.eventId) {
    await tx.run(LINK_EVENT_TO_STATE_CHANGE, {
      eventId: data.eventId,
      stateChangeId: data.id,
    });
  }

  await tx.run(UNLINK_APPLIES_TO, { stateChangeId: data.id });
  await tx.run(buildLinkAppliesToStatement(data.subjectType), {
    stateChangeId: data.id,
    subjectId: data.subjectId,
  });
};

export const checkTimelineAxisExists = async (
  database: string,
  axisId: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHECK_TIMELINE_AXIS, { id: axisId });
    return (result.records[0]?.get("exists") as boolean | undefined) ?? false;
  } finally {
    await session.close();
  }
};

export const checkEventExists = async (
  database: string,
  eventId: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHECK_EVENT_EXISTS, { id: eventId });
    return (result.records[0]?.get("exists") as boolean | undefined) ?? false;
  } finally {
    await session.close();
  }
};

export const getTimelineMarkerById = async (
  database: string,
  markerId: string
): Promise<TimelineMarkerRefs | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_TIMELINE_MARKER, { id: markerId });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const marker = mapNode(record.get("m")?.properties ?? {}) as TimelineMarkerRefs;
    return marker;
  } finally {
    await session.close();
  }
};

export const checkSubjectExists = async (
  database: string,
  subjectType: TimelineSubjectType,
  subjectId: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(
      buildCheckSubjectExistsStatement(subjectType),
      { id: subjectId }
    );
    return (result.records[0]?.get("exists") as boolean | undefined) ?? false;
  } finally {
    await session.close();
  }
};

export const createTimelineStateChange = async (
  data: TimelineStateChangeNode,
  database: string
): Promise<TimelineStateChangeNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.executeWrite(async (tx) => {
      const createResult = await tx.run(
        CREATE_TIMELINE_STATE_CHANGE,
        buildParams(data, STATE_CHANGE_PARAMS)
      );
      const record = createResult.records[0];
      if (!record) {
        return null;
      }
      await syncStateChangeRelations(tx, data);
      const node = record.get("c");
      return mapNode(node?.properties ?? data) as TimelineStateChangeNode;
    });
    return result;
  } finally {
    await session.close();
  }
};

export const updateTimelineStateChange = async (
  data: TimelineStateChangeNode,
  database: string
): Promise<TimelineStateChangeNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.executeWrite(async (tx) => {
      const updateResult = await tx.run(
        UPDATE_TIMELINE_STATE_CHANGE,
        buildParams(data, STATE_CHANGE_UPDATE_PARAMS)
      );
      const record = updateResult.records[0];
      if (!record) {
        return null;
      }
      await syncStateChangeRelations(tx, data);
      const node = record.get("c");
      return mapNode(node?.properties ?? data) as TimelineStateChangeNode;
    });
    return result;
  } finally {
    await session.close();
  }
};

export const getTimelineStateChanges = async (
  database: string,
  query: TimelineStateChangeListQuery
): Promise<TimelineStateChangeNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q
      ? GET_TIMELINE_STATE_CHANGES_BY_SEARCH
      : GET_TIMELINE_STATE_CHANGES;
    const result = await session.run(statement, {
      q: query.q ?? "",
      axisId: query.axisId ?? null,
      eraId: query.eraId ?? null,
      segmentId: query.segmentId ?? null,
      markerId: query.markerId ?? null,
      eventId: query.eventId ?? null,
      subjectType: query.subjectType ?? null,
      subjectId: query.subjectId ?? null,
      fieldPath: query.fieldPath ?? null,
      status: query.status ?? null,
      tickFrom: query.tickFrom ?? null,
      tickTo: query.tickTo ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("c");
      return mapNode(node?.properties ?? {}) as TimelineStateChangeNode;
    });
  } finally {
    await session.close();
  }
};

export const getTimelineStateChangeCount = async (
  database: string,
  query: TimelineStateChangeListQuery
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q
      ? COUNT_TIMELINE_STATE_CHANGES_BY_SEARCH
      : COUNT_TIMELINE_STATE_CHANGES;
    const result = await session.run(statement, {
      q: query.q ?? "",
      axisId: query.axisId ?? null,
      eraId: query.eraId ?? null,
      segmentId: query.segmentId ?? null,
      markerId: query.markerId ?? null,
      eventId: query.eventId ?? null,
      subjectType: query.subjectType ?? null,
      subjectId: query.subjectId ?? null,
      fieldPath: query.fieldPath ?? null,
      status: query.status ?? null,
      tickFrom: query.tickFrom ?? null,
      tickTo: query.tickTo ?? null,
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

export const getTimelineStateSnapshot = async (
  database: string,
  query: TimelineSnapshotQuery
): Promise<TimelineStateChangeNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_TIMELINE_STATE_SNAPSHOT, {
      axisId: query.axisId,
      tick: query.tick,
      subjectType: query.subjectType ?? null,
      subjectId: query.subjectId ?? null,
    });
    return result.records.map((record) => {
      const node = record.get("c");
      return mapNode(node?.properties ?? {}) as TimelineStateChangeNode;
    });
  } finally {
    await session.close();
  }
};

export const deleteTimelineStateChange = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_TIMELINE_STATE_CHANGE, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};
