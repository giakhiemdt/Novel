import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import {
  TimelineAxisListQuery,
  TimelineAxisNode,
  TimelineEraListQuery,
  TimelineEraNode,
  TimelineMarkerListQuery,
  TimelineMarkerNode,
  TimelineSegmentListQuery,
  TimelineSegmentNode,
} from "./timeline-structure.types";

const CREATE_TIMELINE_AXIS = `
CREATE (a:${nodeLabels.timelineAxis} {
  id: $id,
  name: $name,
  code: $code,
  axisType: $axisType,
  description: $description,
  parentAxisId: $parentAxisId,
  originSegmentId: $originSegmentId,
  originOffsetYears: $originOffsetYears,
  policy: $policy,
  sortOrder: $sortOrder,
  startTick: $startTick,
  endTick: $endTick,
  status: $status,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN a
`;

const UPDATE_TIMELINE_AXIS = `
MATCH (a:${nodeLabels.timelineAxis} {id: $id})
SET
  a.name = $name,
  a.code = $code,
  a.axisType = $axisType,
  a.description = $description,
  a.parentAxisId = $parentAxisId,
  a.originSegmentId = $originSegmentId,
  a.originOffsetYears = $originOffsetYears,
  a.policy = $policy,
  a.sortOrder = $sortOrder,
  a.startTick = $startTick,
  a.endTick = $endTick,
  a.status = $status,
  a.notes = $notes,
  a.tags = $tags,
  a.updatedAt = $updatedAt
RETURN a
`;

const GET_TIMELINE_AXES = `
MATCH (a:${nodeLabels.timelineAxis})
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(a.code) CONTAINS toLower($code))
  AND ($axisType IS NULL OR a.axisType = $axisType)
  AND ($status IS NULL OR a.status = $status)
  AND ($parentAxisId IS NULL OR a.parentAxisId = $parentAxisId)
RETURN a
ORDER BY coalesce(a.sortOrder, 0) ASC, a.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_TIMELINE_AXES_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_axis_search", $q) YIELD node, score
WITH node AS a, score
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(a.code) CONTAINS toLower($code))
  AND ($axisType IS NULL OR a.axisType = $axisType)
  AND ($status IS NULL OR a.status = $status)
  AND ($parentAxisId IS NULL OR a.parentAxisId = $parentAxisId)
RETURN a
ORDER BY score DESC, coalesce(a.sortOrder, 0) ASC, a.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const COUNT_TIMELINE_AXES = `
MATCH (a:${nodeLabels.timelineAxis})
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(a.code) CONTAINS toLower($code))
  AND ($axisType IS NULL OR a.axisType = $axisType)
  AND ($status IS NULL OR a.status = $status)
  AND ($parentAxisId IS NULL OR a.parentAxisId = $parentAxisId)
RETURN count(a) AS total
`;

const COUNT_TIMELINE_AXES_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_axis_search", $q) YIELD node, score
WITH node AS a, score
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(a.code) CONTAINS toLower($code))
  AND ($axisType IS NULL OR a.axisType = $axisType)
  AND ($status IS NULL OR a.status = $status)
  AND ($parentAxisId IS NULL OR a.parentAxisId = $parentAxisId)
RETURN count(a) AS total
`;

const DELETE_TIMELINE_AXIS = `
MATCH (a:${nodeLabels.timelineAxis} {id: $id})
WITH a, a.id AS axisId
CALL {
  WITH axisId
  MATCH (child:${nodeLabels.timelineAxis})
  WHERE child.parentAxisId = axisId
  SET child.parentAxisId = NULL,
      child.originSegmentId = NULL,
      child.originOffsetYears = NULL
  RETURN count(child) AS updatedChildren
}
CALL {
  WITH axisId
  OPTIONAL MATCH (m:${nodeLabels.timelineMarker} {axisId: axisId})
  DETACH DELETE m
  RETURN count(m) AS deletedMarkers
}
CALL {
  WITH axisId
  OPTIONAL MATCH (s:${nodeLabels.timelineSegment} {axisId: axisId})
  DETACH DELETE s
  RETURN count(s) AS deletedSegments
}
CALL {
  WITH axisId
  OPTIONAL MATCH (e:${nodeLabels.timelineEra} {axisId: axisId})
  DETACH DELETE e
  RETURN count(e) AS deletedEras
}
DETACH DELETE a
RETURN 1 AS deleted
`;

const CHECK_TIMELINE_AXIS = `
MATCH (a:${nodeLabels.timelineAxis} {id: $id})
RETURN a IS NOT NULL AS exists
`;

const COUNT_MAIN_TIMELINE_AXES = `
MATCH (a:${nodeLabels.timelineAxis})
WHERE a.axisType = 'main'
  AND ($excludeId IS NULL OR a.id <> $excludeId)
RETURN count(a) AS total
`;

const CREATE_TIMELINE_ERA = `
MATCH (a:${nodeLabels.timelineAxis} {id: $axisId})
CREATE (e:${nodeLabels.timelineEra} {
  id: $id,
  axisId: $axisId,
  name: $name,
  code: $code,
  summary: $summary,
  description: $description,
  order: $order,
  startTick: $startTick,
  endTick: $endTick,
  status: $status,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
MERGE (a)-[:${relationTypes.timelineHasEra}]->(e)
RETURN e
`;

const UPDATE_TIMELINE_ERA = `
MATCH (e:${nodeLabels.timelineEra} {id: $id})
SET
  e.axisId = $axisId,
  e.name = $name,
  e.code = $code,
  e.summary = $summary,
  e.description = $description,
  e.order = $order,
  e.startTick = $startTick,
  e.endTick = $endTick,
  e.status = $status,
  e.notes = $notes,
  e.tags = $tags,
  e.updatedAt = $updatedAt
WITH e
OPTIONAL MATCH (:${nodeLabels.timelineAxis})-[oldRel:${relationTypes.timelineHasEra}]->(e)
DELETE oldRel
WITH e
MATCH (a:${nodeLabels.timelineAxis} {id: $axisId})
MERGE (a)-[:${relationTypes.timelineHasEra}]->(e)
RETURN e
`;

const GET_TIMELINE_ERAS = `
MATCH (e:${nodeLabels.timelineEra})
WHERE
  EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: e.axisId}) }
  AND ($name IS NULL OR toLower(e.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(e.code) CONTAINS toLower($code))
  AND ($axisId IS NULL OR e.axisId = $axisId)
  AND ($status IS NULL OR e.status = $status)
RETURN e
ORDER BY e.axisId ASC, coalesce(e.order, 0) ASC, e.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_TIMELINE_ERAS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_era_search", $q) YIELD node, score
WITH node AS e, score
WHERE
  EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: e.axisId}) }
  AND ($name IS NULL OR toLower(e.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(e.code) CONTAINS toLower($code))
  AND ($axisId IS NULL OR e.axisId = $axisId)
  AND ($status IS NULL OR e.status = $status)
RETURN e
ORDER BY score DESC, e.axisId ASC, coalesce(e.order, 0) ASC, e.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const COUNT_TIMELINE_ERAS = `
MATCH (e:${nodeLabels.timelineEra})
WHERE
  EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: e.axisId}) }
  AND ($name IS NULL OR toLower(e.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(e.code) CONTAINS toLower($code))
  AND ($axisId IS NULL OR e.axisId = $axisId)
  AND ($status IS NULL OR e.status = $status)
RETURN count(e) AS total
`;

const COUNT_TIMELINE_ERAS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_era_search", $q) YIELD node, score
WITH node AS e, score
WHERE
  EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: e.axisId}) }
  AND ($name IS NULL OR toLower(e.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(e.code) CONTAINS toLower($code))
  AND ($axisId IS NULL OR e.axisId = $axisId)
  AND ($status IS NULL OR e.status = $status)
RETURN count(e) AS total
`;

const GET_TIMELINE_ERA_BY_ID = `
MATCH (e:${nodeLabels.timelineEra} {id: $id})
RETURN e
`;

const DELETE_TIMELINE_ERA = `
MATCH (e:${nodeLabels.timelineEra} {id: $id})
WITH e, e.id AS eraId
CALL {
  WITH eraId
  OPTIONAL MATCH (m:${nodeLabels.timelineMarker} {eraId: eraId})
  DETACH DELETE m
  RETURN count(m) AS deletedMarkers
}
CALL {
  WITH eraId
  OPTIONAL MATCH (s:${nodeLabels.timelineSegment} {eraId: eraId})
  DETACH DELETE s
  RETURN count(s) AS deletedSegments
}
DETACH DELETE e
RETURN 1 AS deleted
`;

const CREATE_TIMELINE_SEGMENT = `
MATCH (e:${nodeLabels.timelineEra} {id: $eraId})
CREATE (s:${nodeLabels.timelineSegment} {
  id: $id,
  axisId: $axisId,
  eraId: $eraId,
  name: $name,
  durationYears: $durationYears,
  code: $code,
  summary: $summary,
  description: $description,
  order: $order,
  startTick: $startTick,
  endTick: $endTick,
  status: $status,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
MERGE (e)-[:${relationTypes.timelineHasSegment}]->(s)
RETURN s
`;

const UPDATE_TIMELINE_SEGMENT = `
MATCH (s:${nodeLabels.timelineSegment} {id: $id})
SET
  s.axisId = $axisId,
  s.eraId = $eraId,
  s.name = $name,
  s.durationYears = $durationYears,
  s.code = $code,
  s.summary = $summary,
  s.description = $description,
  s.order = $order,
  s.startTick = $startTick,
  s.endTick = $endTick,
  s.status = $status,
  s.notes = $notes,
  s.tags = $tags,
  s.updatedAt = $updatedAt
WITH s
OPTIONAL MATCH (:${nodeLabels.timelineEra})-[oldRel:${relationTypes.timelineHasSegment}]->(s)
DELETE oldRel
WITH s
MATCH (e:${nodeLabels.timelineEra} {id: $eraId})
MERGE (e)-[:${relationTypes.timelineHasSegment}]->(s)
RETURN s
`;

const GET_TIMELINE_SEGMENTS = `
MATCH (s:${nodeLabels.timelineSegment})
WHERE
  EXISTS { MATCH (e:${nodeLabels.timelineEra} {id: s.eraId}) }
  AND EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: s.axisId}) }
  AND ($name IS NULL OR toLower(s.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(s.code) CONTAINS toLower($code))
  AND ($axisId IS NULL OR s.axisId = $axisId)
  AND ($eraId IS NULL OR s.eraId = $eraId)
  AND ($status IS NULL OR s.status = $status)
RETURN s
ORDER BY s.axisId ASC, s.eraId ASC, coalesce(s.order, 0) ASC, s.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_TIMELINE_SEGMENTS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_segment_search", $q) YIELD node, score
WITH node AS s, score
WHERE
  EXISTS { MATCH (e:${nodeLabels.timelineEra} {id: s.eraId}) }
  AND EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: s.axisId}) }
  AND ($name IS NULL OR toLower(s.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(s.code) CONTAINS toLower($code))
  AND ($axisId IS NULL OR s.axisId = $axisId)
  AND ($eraId IS NULL OR s.eraId = $eraId)
  AND ($status IS NULL OR s.status = $status)
RETURN s
ORDER BY score DESC, s.axisId ASC, s.eraId ASC, coalesce(s.order, 0) ASC, s.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const COUNT_TIMELINE_SEGMENTS = `
MATCH (s:${nodeLabels.timelineSegment})
WHERE
  EXISTS { MATCH (e:${nodeLabels.timelineEra} {id: s.eraId}) }
  AND EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: s.axisId}) }
  AND ($name IS NULL OR toLower(s.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(s.code) CONTAINS toLower($code))
  AND ($axisId IS NULL OR s.axisId = $axisId)
  AND ($eraId IS NULL OR s.eraId = $eraId)
  AND ($status IS NULL OR s.status = $status)
RETURN count(s) AS total
`;

const COUNT_TIMELINE_SEGMENTS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_segment_search", $q) YIELD node, score
WITH node AS s, score
WHERE
  EXISTS { MATCH (e:${nodeLabels.timelineEra} {id: s.eraId}) }
  AND EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: s.axisId}) }
  AND ($name IS NULL OR toLower(s.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(s.code) CONTAINS toLower($code))
  AND ($axisId IS NULL OR s.axisId = $axisId)
  AND ($eraId IS NULL OR s.eraId = $eraId)
  AND ($status IS NULL OR s.status = $status)
RETURN count(s) AS total
`;

const GET_TIMELINE_SEGMENT_BY_ID = `
MATCH (s:${nodeLabels.timelineSegment} {id: $id})
RETURN s
`;

const DELETE_TIMELINE_SEGMENT = `
MATCH (s:${nodeLabels.timelineSegment} {id: $id})
WITH s, s.id AS segmentId
CALL {
  WITH segmentId
  OPTIONAL MATCH (m:${nodeLabels.timelineMarker} {segmentId: segmentId})
  DETACH DELETE m
  RETURN count(m) AS deletedMarkers
}
DETACH DELETE s
RETURN 1 AS deleted
`;

const CREATE_TIMELINE_MARKER = `
MATCH (s:${nodeLabels.timelineSegment} {id: $segmentId})
CREATE (m:${nodeLabels.timelineMarker} {
  id: $id,
  axisId: $axisId,
  eraId: $eraId,
  segmentId: $segmentId,
  label: $label,
  tick: $tick,
  markerType: $markerType,
  description: $description,
  eventRefId: $eventRefId,
  status: $status,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
MERGE (s)-[:${relationTypes.timelineHasMarker}]->(m)
RETURN m
`;

const UPDATE_TIMELINE_MARKER = `
MATCH (m:${nodeLabels.timelineMarker} {id: $id})
SET
  m.axisId = $axisId,
  m.eraId = $eraId,
  m.segmentId = $segmentId,
  m.label = $label,
  m.tick = $tick,
  m.markerType = $markerType,
  m.description = $description,
  m.eventRefId = $eventRefId,
  m.status = $status,
  m.notes = $notes,
  m.tags = $tags,
  m.updatedAt = $updatedAt
WITH m
OPTIONAL MATCH (:${nodeLabels.timelineSegment})-[oldRel:${relationTypes.timelineHasMarker}]->(m)
DELETE oldRel
WITH m
MATCH (s:${nodeLabels.timelineSegment} {id: $segmentId})
MERGE (s)-[:${relationTypes.timelineHasMarker}]->(m)
RETURN m
`;

const GET_TIMELINE_MARKERS = `
MATCH (m:${nodeLabels.timelineMarker})
WHERE
  EXISTS { MATCH (s:${nodeLabels.timelineSegment} {id: m.segmentId}) }
  AND EXISTS { MATCH (e:${nodeLabels.timelineEra} {id: m.eraId}) }
  AND EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: m.axisId}) }
  AND ($label IS NULL OR toLower(m.label) CONTAINS toLower($label))
  AND ($markerType IS NULL OR m.markerType = $markerType)
  AND ($axisId IS NULL OR m.axisId = $axisId)
  AND ($eraId IS NULL OR m.eraId = $eraId)
  AND ($segmentId IS NULL OR m.segmentId = $segmentId)
  AND ($status IS NULL OR m.status = $status)
  AND ($tickFrom IS NULL OR m.tick >= $tickFrom)
  AND ($tickTo IS NULL OR m.tick <= $tickTo)
RETURN m
ORDER BY m.axisId ASC, m.eraId ASC, m.segmentId ASC, m.tick ASC, m.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_TIMELINE_MARKERS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_marker_search", $q) YIELD node, score
WITH node AS m, score
WHERE
  EXISTS { MATCH (s:${nodeLabels.timelineSegment} {id: m.segmentId}) }
  AND EXISTS { MATCH (e:${nodeLabels.timelineEra} {id: m.eraId}) }
  AND EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: m.axisId}) }
  AND ($label IS NULL OR toLower(m.label) CONTAINS toLower($label))
  AND ($markerType IS NULL OR m.markerType = $markerType)
  AND ($axisId IS NULL OR m.axisId = $axisId)
  AND ($eraId IS NULL OR m.eraId = $eraId)
  AND ($segmentId IS NULL OR m.segmentId = $segmentId)
  AND ($status IS NULL OR m.status = $status)
  AND ($tickFrom IS NULL OR m.tick >= $tickFrom)
  AND ($tickTo IS NULL OR m.tick <= $tickTo)
RETURN m
ORDER BY score DESC, m.axisId ASC, m.eraId ASC, m.segmentId ASC, m.tick ASC, m.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const COUNT_TIMELINE_MARKERS = `
MATCH (m:${nodeLabels.timelineMarker})
WHERE
  EXISTS { MATCH (s:${nodeLabels.timelineSegment} {id: m.segmentId}) }
  AND EXISTS { MATCH (e:${nodeLabels.timelineEra} {id: m.eraId}) }
  AND EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: m.axisId}) }
  AND ($label IS NULL OR toLower(m.label) CONTAINS toLower($label))
  AND ($markerType IS NULL OR m.markerType = $markerType)
  AND ($axisId IS NULL OR m.axisId = $axisId)
  AND ($eraId IS NULL OR m.eraId = $eraId)
  AND ($segmentId IS NULL OR m.segmentId = $segmentId)
  AND ($status IS NULL OR m.status = $status)
  AND ($tickFrom IS NULL OR m.tick >= $tickFrom)
  AND ($tickTo IS NULL OR m.tick <= $tickTo)
RETURN count(m) AS total
`;

const COUNT_TIMELINE_MARKERS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("timeline_marker_search", $q) YIELD node, score
WITH node AS m, score
WHERE
  EXISTS { MATCH (s:${nodeLabels.timelineSegment} {id: m.segmentId}) }
  AND EXISTS { MATCH (e:${nodeLabels.timelineEra} {id: m.eraId}) }
  AND EXISTS { MATCH (a:${nodeLabels.timelineAxis} {id: m.axisId}) }
  AND ($label IS NULL OR toLower(m.label) CONTAINS toLower($label))
  AND ($markerType IS NULL OR m.markerType = $markerType)
  AND ($axisId IS NULL OR m.axisId = $axisId)
  AND ($eraId IS NULL OR m.eraId = $eraId)
  AND ($segmentId IS NULL OR m.segmentId = $segmentId)
  AND ($status IS NULL OR m.status = $status)
  AND ($tickFrom IS NULL OR m.tick >= $tickFrom)
  AND ($tickTo IS NULL OR m.tick <= $tickTo)
RETURN count(m) AS total
`;

const DELETE_TIMELINE_MARKER = `
MATCH (m:${nodeLabels.timelineMarker} {id: $id})
WITH m
DETACH DELETE m
RETURN 1 AS deleted
`;

const AXIS_PARAMS = [
  "id",
  "name",
  "code",
  "axisType",
  "description",
  "parentAxisId",
  "originSegmentId",
  "originOffsetYears",
  "policy",
  "sortOrder",
  "startTick",
  "endTick",
  "status",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const ERA_PARAMS = [
  "id",
  "axisId",
  "name",
  "code",
  "summary",
  "description",
  "order",
  "startTick",
  "endTick",
  "status",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const SEGMENT_PARAMS = [
  "id",
  "axisId",
  "eraId",
  "name",
  "durationYears",
  "code",
  "summary",
  "description",
  "order",
  "startTick",
  "endTick",
  "status",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const MARKER_PARAMS = [
  "id",
  "axisId",
  "eraId",
  "segmentId",
  "label",
  "tick",
  "markerType",
  "description",
  "eventRefId",
  "status",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const AXIS_UPDATE_PARAMS = AXIS_PARAMS.filter((key) => key !== "createdAt");
const ERA_UPDATE_PARAMS = ERA_PARAMS.filter((key) => key !== "createdAt");
const SEGMENT_UPDATE_PARAMS = SEGMENT_PARAMS.filter((key) => key !== "createdAt");
const MARKER_UPDATE_PARAMS = MARKER_PARAMS.filter((key) => key !== "createdAt");

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

export const countMainTimelineAxes = async (
  database: string,
  excludeId?: string
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(COUNT_MAIN_TIMELINE_AXES, {
      excludeId: excludeId ?? null,
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

export const getTimelineEraById = async (
  database: string,
  eraId: string
): Promise<TimelineEraNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_TIMELINE_ERA_BY_ID, { id: eraId });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("e");
    return mapNode(node?.properties ?? {}) as TimelineEraNode;
  } finally {
    await session.close();
  }
};

export const getTimelineSegmentById = async (
  database: string,
  segmentId: string
): Promise<TimelineSegmentNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_TIMELINE_SEGMENT_BY_ID, { id: segmentId });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("s");
    return mapNode(node?.properties ?? {}) as TimelineSegmentNode;
  } finally {
    await session.close();
  }
};

export const createTimelineAxis = async (
  data: TimelineAxisNode,
  database: string
): Promise<TimelineAxisNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(CREATE_TIMELINE_AXIS, buildParams(data, AXIS_PARAMS));
    const node = result.records[0]?.get("a");
    return mapNode(node?.properties ?? data) as TimelineAxisNode;
  } finally {
    await session.close();
  }
};

export const updateTimelineAxis = async (
  data: TimelineAxisNode,
  database: string
): Promise<TimelineAxisNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(
      UPDATE_TIMELINE_AXIS,
      buildParams(data, AXIS_UPDATE_PARAMS)
    );
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("a");
    return mapNode(node?.properties ?? data) as TimelineAxisNode;
  } finally {
    await session.close();
  }
};

export const getTimelineAxes = async (
  database: string,
  query: TimelineAxisListQuery
): Promise<TimelineAxisNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_TIMELINE_AXES_BY_SEARCH : GET_TIMELINE_AXES;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      code: query.code ?? null,
      axisType: query.axisType ?? null,
      status: query.status ?? null,
      parentAxisId: query.parentAxisId ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("a");
      return mapNode(node?.properties ?? {}) as TimelineAxisNode;
    });
  } finally {
    await session.close();
  }
};

export const getTimelineAxisCount = async (
  database: string,
  query: TimelineAxisListQuery
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? COUNT_TIMELINE_AXES_BY_SEARCH : COUNT_TIMELINE_AXES;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      code: query.code ?? null,
      axisType: query.axisType ?? null,
      status: query.status ?? null,
      parentAxisId: query.parentAxisId ?? null,
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

export const deleteTimelineAxis = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_TIMELINE_AXIS, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const createTimelineEra = async (
  data: TimelineEraNode,
  database: string
): Promise<TimelineEraNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(CREATE_TIMELINE_ERA, buildParams(data, ERA_PARAMS));
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("e");
    return mapNode(node?.properties ?? data) as TimelineEraNode;
  } finally {
    await session.close();
  }
};

export const updateTimelineEra = async (
  data: TimelineEraNode,
  database: string
): Promise<TimelineEraNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(
      UPDATE_TIMELINE_ERA,
      buildParams(data, ERA_UPDATE_PARAMS)
    );
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("e");
    return mapNode(node?.properties ?? data) as TimelineEraNode;
  } finally {
    await session.close();
  }
};

export const getTimelineEras = async (
  database: string,
  query: TimelineEraListQuery
): Promise<TimelineEraNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_TIMELINE_ERAS_BY_SEARCH : GET_TIMELINE_ERAS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      code: query.code ?? null,
      axisId: query.axisId ?? null,
      status: query.status ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("e");
      return mapNode(node?.properties ?? {}) as TimelineEraNode;
    });
  } finally {
    await session.close();
  }
};

export const getTimelineEraCount = async (
  database: string,
  query: TimelineEraListQuery
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? COUNT_TIMELINE_ERAS_BY_SEARCH : COUNT_TIMELINE_ERAS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      code: query.code ?? null,
      axisId: query.axisId ?? null,
      status: query.status ?? null,
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

export const deleteTimelineEra = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_TIMELINE_ERA, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const createTimelineSegment = async (
  data: TimelineSegmentNode,
  database: string
): Promise<TimelineSegmentNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(
      CREATE_TIMELINE_SEGMENT,
      buildParams(data, SEGMENT_PARAMS)
    );
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("s");
    return mapNode(node?.properties ?? data) as TimelineSegmentNode;
  } finally {
    await session.close();
  }
};

export const updateTimelineSegment = async (
  data: TimelineSegmentNode,
  database: string
): Promise<TimelineSegmentNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(
      UPDATE_TIMELINE_SEGMENT,
      buildParams(data, SEGMENT_UPDATE_PARAMS)
    );
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("s");
    return mapNode(node?.properties ?? data) as TimelineSegmentNode;
  } finally {
    await session.close();
  }
};

export const getTimelineSegments = async (
  database: string,
  query: TimelineSegmentListQuery
): Promise<TimelineSegmentNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q
      ? GET_TIMELINE_SEGMENTS_BY_SEARCH
      : GET_TIMELINE_SEGMENTS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      code: query.code ?? null,
      axisId: query.axisId ?? null,
      eraId: query.eraId ?? null,
      status: query.status ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("s");
      return mapNode(node?.properties ?? {}) as TimelineSegmentNode;
    });
  } finally {
    await session.close();
  }
};

export const getTimelineSegmentCount = async (
  database: string,
  query: TimelineSegmentListQuery
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q
      ? COUNT_TIMELINE_SEGMENTS_BY_SEARCH
      : COUNT_TIMELINE_SEGMENTS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      code: query.code ?? null,
      axisId: query.axisId ?? null,
      eraId: query.eraId ?? null,
      status: query.status ?? null,
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

export const deleteTimelineSegment = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_TIMELINE_SEGMENT, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const createTimelineMarker = async (
  data: TimelineMarkerNode,
  database: string
): Promise<TimelineMarkerNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(CREATE_TIMELINE_MARKER, buildParams(data, MARKER_PARAMS));
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("m");
    return mapNode(node?.properties ?? data) as TimelineMarkerNode;
  } finally {
    await session.close();
  }
};

export const updateTimelineMarker = async (
  data: TimelineMarkerNode,
  database: string
): Promise<TimelineMarkerNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(
      UPDATE_TIMELINE_MARKER,
      buildParams(data, MARKER_UPDATE_PARAMS)
    );
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("m");
    return mapNode(node?.properties ?? data) as TimelineMarkerNode;
  } finally {
    await session.close();
  }
};

export const getTimelineMarkers = async (
  database: string,
  query: TimelineMarkerListQuery
): Promise<TimelineMarkerNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_TIMELINE_MARKERS_BY_SEARCH : GET_TIMELINE_MARKERS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      label: query.label ?? null,
      markerType: query.markerType ?? null,
      axisId: query.axisId ?? null,
      eraId: query.eraId ?? null,
      segmentId: query.segmentId ?? null,
      status: query.status ?? null,
      tickFrom: query.tickFrom ?? null,
      tickTo: query.tickTo ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("m");
      return mapNode(node?.properties ?? {}) as TimelineMarkerNode;
    });
  } finally {
    await session.close();
  }
};

export const getTimelineMarkerCount = async (
  database: string,
  query: TimelineMarkerListQuery
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q
      ? COUNT_TIMELINE_MARKERS_BY_SEARCH
      : COUNT_TIMELINE_MARKERS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      label: query.label ?? null,
      markerType: query.markerType ?? null,
      axisId: query.axisId ?? null,
      eraId: query.eraId ?? null,
      segmentId: query.segmentId ?? null,
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

export const deleteTimelineMarker = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_TIMELINE_MARKER, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};
