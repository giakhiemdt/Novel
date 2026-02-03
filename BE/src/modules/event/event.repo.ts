import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { EventListQuery, EventNode } from "./event.types";

const CREATE_EVENT = `
CREATE (e:${nodeLabels.event} {
  id: $id,
  name: $name,
  type: $type,
  typeDetail: $typeDetail,
  scope: $scope,
  locationId: $locationId,
  location: $location,
  startYear: $startYear,
  endYear: $endYear,
  summary: $summary,
  description: $description,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN e
`;

const UPDATE_EVENT = `
MATCH (e:${nodeLabels.event} {id: $id})
SET
  e.name = $name,
  e.type = $type,
  e.typeDetail = $typeDetail,
  e.scope = $scope,
  e.locationId = $locationId,
  e.location = $location,
  e.startYear = $startYear,
  e.endYear = $endYear,
  e.summary = $summary,
  e.description = $description,
  e.notes = $notes,
  e.tags = $tags,
  e.updatedAt = $updatedAt
RETURN e
`;

const CREATE_EVENT_WITH_LOCATION = `
MATCH (l:${nodeLabels.location} {id: $locationId})
CREATE (e:${nodeLabels.event} {
  id: $id,
  name: $name,
  type: $type,
  typeDetail: $typeDetail,
  scope: $scope,
  locationId: $locationId,
  location: $location,
  startYear: $startYear,
  endYear: $endYear,
  summary: $summary,
  description: $description,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
CREATE (e)-[:${relationTypes.occursIn} {note: $note}]->(l)
RETURN e, l
`;

const UPDATE_EVENT_WITH_LOCATION = `
MATCH (e:${nodeLabels.event} {id: $id})
MATCH (l:${nodeLabels.location} {id: $locationId})
OPTIONAL MATCH (e)-[r:${relationTypes.occursIn}]->(:${nodeLabels.location})
DELETE r
SET
  e.name = $name,
  e.type = $type,
  e.typeDetail = $typeDetail,
  e.scope = $scope,
  e.locationId = $locationId,
  e.location = $location,
  e.startYear = $startYear,
  e.endYear = $endYear,
  e.summary = $summary,
  e.description = $description,
  e.notes = $notes,
  e.tags = $tags,
  e.updatedAt = $updatedAt
CREATE (e)-[:${relationTypes.occursIn} {note: $note}]->(l)
RETURN e, l
`;

const DELETE_EVENT_PARTICIPANTS = `
MATCH (c:${nodeLabels.character})-[r:${relationTypes.participatesIn}]->(e:${nodeLabels.event} {id: $eventId})
DELETE r
`;

const UPSERT_EVENT_PARTICIPANTS = `
MATCH (e:${nodeLabels.event} {id: $eventId})
UNWIND $participants AS p
MATCH (c:${nodeLabels.character} {id: p.characterId})
MERGE (c)-[r:${relationTypes.participatesIn}]->(e)
SET
  r.role = p.role,
  r.participationType = p.participationType,
  r.outcome = p.outcome,
  r.statusChange = p.statusChange,
  r.note = p.note
RETURN count(r) AS linked
`;

const GET_CHARACTER_IDS = `
UNWIND $ids AS id
MATCH (c:${nodeLabels.character} {id: id})
RETURN collect(c.id) AS ids
`;

const DELETE_OCCURS_IN = `
MATCH (e:${nodeLabels.event} {id: $eventId})-[r:${relationTypes.occursIn}]->(:${nodeLabels.location})
DELETE r
`;

const GET_EVENTS = `
MATCH (e:${nodeLabels.event})
OPTIONAL MATCH (e)-[:${relationTypes.occursIn}]->(l:${nodeLabels.location})
OPTIONAL MATCH (e)-[on:${relationTypes.occursOn}]->(t:${nodeLabels.timeline})
WITH e, l, t, on
WHERE
  ($timelineId IS NULL OR t.id = $timelineId)
  AND ($locationId IS NULL OR l.id = $locationId OR e.locationId = $locationId)
  AND ($characterId IS NULL OR EXISTS {
    MATCH (c:${nodeLabels.character} {id: $characterId})-[:${relationTypes.participatesIn}]->(e)
  })
  AND ($tag IS NULL OR $tag IN coalesce(e.tags, []))
  AND ($name IS NULL OR toLower(e.name) CONTAINS toLower($name))
  AND ($type IS NULL OR e.type = $type)
OPTIONAL MATCH (c:${nodeLabels.character})-[r:${relationTypes.participatesIn}]->(e)
RETURN e, l, t, on, collect({
  characterId: c.id,
  characterName: c.name,
  role: r.role,
  participationType: r.participationType,
  outcome: r.outcome,
  statusChange: r.statusChange,
  note: r.note
}) AS participants
ORDER BY e.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_EVENTS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("event_search", $q) YIELD node, score
WITH node AS e, score
OPTIONAL MATCH (e)-[:${relationTypes.occursIn}]->(l:${nodeLabels.location})
OPTIONAL MATCH (e)-[on:${relationTypes.occursOn}]->(t:${nodeLabels.timeline})
WITH e, l, t, on, score
WHERE
  ($timelineId IS NULL OR t.id = $timelineId)
  AND ($locationId IS NULL OR l.id = $locationId OR e.locationId = $locationId)
  AND ($characterId IS NULL OR EXISTS {
    MATCH (c:${nodeLabels.character} {id: $characterId})-[:${relationTypes.participatesIn}]->(e)
  })
  AND ($tag IS NULL OR $tag IN coalesce(e.tags, []))
  AND ($name IS NULL OR toLower(e.name) CONTAINS toLower($name))
  AND ($type IS NULL OR e.type = $type)
OPTIONAL MATCH (c:${nodeLabels.character})-[r:${relationTypes.participatesIn}]->(e)
RETURN e, l, t, on, collect({
  characterId: c.id,
  characterName: c.name,
  role: r.role,
  participationType: r.participationType,
  outcome: r.outcome,
  statusChange: r.statusChange,
  note: r.note
}) AS participants
ORDER BY score DESC, e.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const EVENT_PARAMS = [
  "id",
  "name",
  "type",
  "typeDetail",
  "scope",
  "locationId",
  "location",
  "startYear",
  "endYear",
  "summary",
  "description",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const EVENT_UPDATE_PARAMS = EVENT_PARAMS.filter((key) => key !== "createdAt");

const GET_TIMELINE_NAME = `
MATCH (t:${nodeLabels.timeline} {id: $timelineId})
RETURN t.name AS name
`;

const GET_LOCATION_NAME = `
MATCH (l:${nodeLabels.location} {id: $locationId})
RETURN l.name AS name
`;

const DELETE_EVENT = `
MATCH (e:${nodeLabels.event} {id: $id})
WITH e
DETACH DELETE e
RETURN 1 AS deleted
`;

const UPSERT_OCCURS_ON = `
MATCH (e:${nodeLabels.event} {id: $eventId})
MATCH (t:${nodeLabels.timeline} {id: $timelineId})
MERGE (e)-[r:${relationTypes.occursOn}]->(t)
SET
  r.year = $timelineYear,
  r.durationValue = $durationValue,
  r.durationUnit = $durationUnit
RETURN t, r
`;

const DELETE_OCCURS_ON = `
MATCH (e:${nodeLabels.event} {id: $eventId})-[r:${relationTypes.occursOn}]->(:${nodeLabels.timeline})
DELETE r
`;

export const createEvent = async (
  data: EventNode,
  database: string
): Promise<EventNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, EVENT_PARAMS);
    const result = await session.run(CREATE_EVENT, params);
    const record = result.records[0];
    const node = record?.get("e");
    return mapNode(node?.properties ?? data) as EventNode;
  } finally {
    await session.close();
  }
};

export const createEventWithLocation = async (
  data: EventNode,
  locationId: string,
  note: string,
  database: string
): Promise<{ event: EventNode; locationName: string } | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(
      {
        ...data,
        locationId,
        note,
      },
      [...EVENT_PARAMS, "note"]
    );
    const result = await session.run(CREATE_EVENT_WITH_LOCATION, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("e");
    const location = record.get("l");
    return {
      event: mapNode(node?.properties ?? data) as EventNode,
      locationName: location?.properties?.name ?? "",
    };
  } finally {
    await session.close();
  }
};

export const updateEventWithLocation = async (
  data: EventNode,
  locationId: string,
  note: string,
  database: string
): Promise<{ event: EventNode; locationName: string } | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(
      {
        ...data,
        locationId,
        note,
      },
      [...EVENT_UPDATE_PARAMS, "note"]
    );
    const result = await session.run(UPDATE_EVENT_WITH_LOCATION, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("e");
    const location = record.get("l");
    return {
      event: mapNode(node?.properties ?? data) as EventNode,
      locationName: location?.properties?.name ?? "",
    };
  } finally {
    await session.close();
  }
};

export const updateEvent = async (
  data: EventNode,
  database: string
): Promise<EventNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, EVENT_UPDATE_PARAMS);
    const result = await session.run(UPDATE_EVENT, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("e");
    return mapNode(node?.properties ?? data) as EventNode;
  } finally {
    await session.close();
  }
};

export const deleteEvent = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_EVENT, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const upsertEventTimeline = async (
  database: string,
  eventId: string,
  timelineId: string,
  timelineYear: number,
  durationValue: number,
  durationUnit: string
): Promise<{ timelineName: string } | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(UPSERT_OCCURS_ON, {
      eventId,
      timelineId,
      timelineYear,
      durationValue,
      durationUnit,
    });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const timeline = record.get("t");
    return { timelineName: timeline?.properties?.name ?? "" };
  } finally {
    await session.close();
  }
};

export const deleteEventTimeline = async (
  database: string,
  eventId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(DELETE_OCCURS_ON, { eventId });
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

export const getTimelineName = async (
  database: string,
  timelineId: string
): Promise<string | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_TIMELINE_NAME, { timelineId });
    return (result.records[0]?.get("name") as string | undefined) ?? null;
  } finally {
    await session.close();
  }
};

export const getLocationName = async (
  database: string,
  locationId: string
): Promise<string | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_LOCATION_NAME, { locationId });
    return (result.records[0]?.get("name") as string | undefined) ?? null;
  } finally {
    await session.close();
  }
};

export const deleteEventParticipants = async (
  database: string,
  eventId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(DELETE_EVENT_PARTICIPANTS, { eventId });
  } finally {
    await session.close();
  }
};

export const updateEventParticipants = async (
  database: string,
  eventId: string,
  participants: {
    characterId: string;
    role: string;
    participationType: string;
    outcome?: string;
    statusChange?: string;
    note?: string;
  }[]
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.executeWrite(async (tx) => {
      await tx.run(DELETE_EVENT_PARTICIPANTS, { eventId });
      if (participants.length === 0) {
        return;
      }
      await tx.run(UPSERT_EVENT_PARTICIPANTS, {
        eventId,
        participants: participants.map((item) => ({
          ...item,
          outcome: item.outcome ?? null,
          statusChange: item.statusChange ?? null,
          note: item.note ?? null,
        })),
      });
    });
  } finally {
    await session.close();
  }
};

export const deleteEventLocation = async (
  database: string,
  eventId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(DELETE_OCCURS_IN, { eventId });
  } finally {
    await session.close();
  }
};

export const getEvents = async (
  database: string,
  query: EventListQuery
): Promise<EventNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_EVENTS_BY_SEARCH : GET_EVENTS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      timelineId: query.timelineId ?? null,
      locationId: query.locationId ?? null,
      characterId: query.characterId ?? null,
      tag: query.tag ?? null,
      name: query.name ?? null,
      type: query.type ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("e");
      const location = record.get("l");
      const timeline = record.get("t");
      const occursOn = record.get("on");
      const participants = (record.get("participants") as Array<
        Record<string, unknown> | null
      >)?.filter((item) => item && item.characterId);
      return {
        ...(mapNode(node?.properties ?? {}) as EventNode),
        locationId: location?.properties?.id ?? node?.properties?.locationId,
        locationName: location?.properties?.name,
        timelineId: timeline?.properties?.id ?? undefined,
        timelineName: timeline?.properties?.name ?? undefined,
        timelineYear: occursOn?.properties?.year ?? undefined,
        durationValue: occursOn?.properties?.durationValue ?? undefined,
        durationUnit: occursOn?.properties?.durationUnit ?? undefined,
        participants,
      } as EventNode;
    });
  } finally {
    await session.close();
  }
};
