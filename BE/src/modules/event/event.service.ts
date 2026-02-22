import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createEvent,
  createEventWithLocation,
  deleteLegacyEventTimelineLinks,
  deleteEvent,
  deleteEventParticipants,
  deleteEventLocation,
  getEventCount,
  getCharacterIds,
  getLegacySegmentByTimelineId,
  getLocationName,
  getEvents,
  linkEventToTimelineMarker,
  unlinkEventMarkers,
  upsertEventMarkerInSegment,
  updateEvent,
  updateEventParticipants,
  updateEventWithLocation,
} from "./event.repo";
import {
  EventInput,
  EventListQuery,
  EventNode,
  EventParticipantInput,
} from "./event.types";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const assertRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`${field} is required`, 400);
  }
  return value.trim();
};

const assertOptionalString = (
  value: unknown,
  field: string
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new AppError(`${field} must be a string`, 400);
  }
  return value.trim();
};

const assertOptionalNumber = (
  value: unknown,
  field: string
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError(`${field} must be a number`, 400);
  }
  return value;
};

const parseOptionalQueryString = (
  value: unknown,
  field: string
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new AppError(`${field} must be a string`, 400);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseOptionalQueryNumber = (
  value: unknown,
  field: string
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new AppError(`${field} must be a number`, 400);
    }
    return value;
  }
  if (typeof value !== "string") {
    throw new AppError(`${field} must be a number`, 400);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new AppError(`${field} must be a number`, 400);
  }
  return parsed;
};

const assertRequiredNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError(`${field} is required`, 400);
  }
  return value;
};

const assertOptionalStringArray = (
  value: unknown,
  field: string
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!isStringArray(value)) {
    throw new AppError(`${field} must be an array of strings`, 400);
  }
  return value;
};

const TIMELINE_UNITS = ["DAY", "MONTH", "YEAR"] as const;

const PARTICIPATION_TYPES = ["ACTIVE", "PASSIVE", "INDIRECT"] as const;
const PARTICIPATION_ROLES = [
  "CANDIDATE",
  "PARTICIPANT",
  "LEADER",
  "CHALLENGER",
  "DEFENDER",
  "OBSERVER",
  "VICTIM",
  "ORGANIZER",
] as const;
const PARTICIPATION_OUTCOMES = [
  "PASSED",
  "FAILED",
  "ELIMINATED",
  "SURVIVED",
  "PROMOTED",
  "INJURED",
  "CAPTURED",
  "ESCAPED",
] as const;

const assertOptionalEnum = (
  value: unknown,
  field: string,
  allowed: readonly string[]
): string | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new AppError(`${field} must be a string`, 400);
  }
  const trimmed = value.trim();
  if (!allowed.includes(trimmed)) {
    throw new AppError(`${field} is invalid`, 400);
  }
  return trimmed;
};

const assertEnum = (
  value: unknown,
  field: string,
  allowed: readonly string[]
): string => {
  if (typeof value !== "string") {
    throw new AppError(`${field} is required`, 400);
  }
  const trimmed = value.trim();
  if (!allowed.includes(trimmed)) {
    throw new AppError(`${field} is invalid`, 400);
  }
  return trimmed;
};

const assertParticipants = (
  value: unknown
): EventParticipantInput[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new AppError("participants must be an array", 400);
  }
  const seen = new Set<string>();
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new AppError(`participants[${index}] must be an object`, 400);
    }
    const data = item as Record<string, unknown>;
    const characterId = assertRequiredString(data.characterId, "characterId");
    if (seen.has(characterId)) {
      throw new AppError("participants must be unique", 400);
    }
    seen.add(characterId);
    const participant: EventParticipantInput = {
      characterId,
      role: assertEnum(data.role, "role", PARTICIPATION_ROLES),
      participationType: assertEnum(
        data.participationType,
        "participationType",
        PARTICIPATION_TYPES
      ),
    };
    const outcome = assertOptionalEnum(
      data.outcome,
      "outcome",
      PARTICIPATION_OUTCOMES
    );
    const statusChange = assertOptionalString(data.statusChange, "statusChange");
    const note = assertOptionalString(data.note, "note");
    if (outcome !== undefined) {
      participant.outcome = outcome;
    }
    if (statusChange !== undefined) {
      participant.statusChange = statusChange;
    }
    if (note !== undefined) {
      participant.note = note;
    }
    return participant;
  });
};

const assertDatabaseName = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError("dbName is required", 400);
  }
  const dbName = value.trim();
  const isValid = /^[A-Za-z0-9_-]+$/.test(dbName);
  if (!isValid) {
    throw new AppError(
      "dbName must contain only letters, numbers, underscores, or hyphens",
      400
    );
  }
  return dbName;
};

const addIfDefined = (
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void => {
  if (value !== undefined) {
    target[key] = value;
  }
};

const validateEventPayload = (payload: unknown): EventInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const startYear = assertOptionalNumber(data.startYear, "startYear");
  const endYear = assertOptionalNumber(data.endYear, "endYear");
  if (startYear !== undefined && endYear !== undefined && endYear < startYear) {
    throw new AppError("endYear must be >= startYear", 400);
  }

  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "type", assertOptionalString(data.type, "type"));
  addIfDefined(
    result,
    "typeDetail",
    assertOptionalString(data.typeDetail, "typeDetail")
  );
  addIfDefined(result, "scope", assertOptionalString(data.scope, "scope"));
  addIfDefined(
    result,
    "locationId",
    assertOptionalString(data.locationId, "locationId")
  );
  addIfDefined(result, "location", assertOptionalString(data.location, "location"));
  addIfDefined(result, "segmentId", assertOptionalString(data.segmentId, "segmentId"));
  const markerId = assertOptionalString(data.markerId, "markerId");
  addIfDefined(result, "markerId", markerId);
  const timelineId = assertOptionalString(data.timelineId, "timelineId");
  if (timelineId !== undefined) {
    const timelineYear = assertRequiredNumber(data.timelineYear, "timelineYear");
    const timelineMonth = assertOptionalNumber(data.timelineMonth, "timelineMonth");
    const timelineDay = assertOptionalNumber(data.timelineDay, "timelineDay");
    const durationValue = assertRequiredNumber(data.durationValue, "durationValue");
    const durationUnit = assertEnum(
      data.durationUnit,
      "durationUnit",
      TIMELINE_UNITS
    );
    if (timelineYear < 0) {
      throw new AppError("timelineYear must be >= 0", 400);
    }
    if (timelineMonth !== undefined && (timelineMonth < 1 || timelineMonth > 12)) {
      throw new AppError("timelineMonth must be between 1 and 12", 400);
    }
    if (timelineDay !== undefined && (timelineDay < 1 || timelineDay > 31)) {
      throw new AppError("timelineDay must be between 1 and 31", 400);
    }
    if (durationValue <= 0) {
      throw new AppError("durationValue must be > 0", 400);
    }
    addIfDefined(result, "timelineId", timelineId);
    addIfDefined(result, "segmentId", timelineId);
    addIfDefined(result, "timelineYear", timelineYear);
    addIfDefined(result, "timelineMonth", timelineMonth);
    addIfDefined(result, "timelineDay", timelineDay);
    addIfDefined(result, "durationValue", durationValue);
    addIfDefined(result, "durationUnit", durationUnit);
  } else {
    const timelineYear = data.timelineYear;
    const timelineMonth = data.timelineMonth;
    const timelineDay = data.timelineDay;
    const durationValue = data.durationValue;
    const durationUnit = data.durationUnit;
    const hasTimelineFields =
      timelineYear !== undefined ||
      timelineMonth !== undefined ||
      timelineDay !== undefined ||
      durationValue !== undefined ||
      durationUnit !== undefined;
    if (hasTimelineFields) {
      throw new AppError(
        "timelineId is required when timeline fields are provided",
        400
      );
    }
    addIfDefined(result, "timelineId", timelineId);
  }
  addIfDefined(result, "startYear", startYear);
  addIfDefined(result, "endYear", endYear);
  addIfDefined(result, "summary", assertOptionalString(data.summary, "summary"));
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(
    result,
    "participants",
    assertParticipants(data.participants)
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as EventInput;
};

const buildEventNode = (payload: EventInput): EventNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

const parseEventListQuery = (query: unknown): EventListQuery => {
  const result: EventListQuery = {};
  if (!query || typeof query !== "object") {
    return { limit: 50, offset: 0 };
  }

  const data = query as Record<string, unknown>;
  const limit = parseOptionalQueryNumber(data.limit, "limit");
  const offset = parseOptionalQueryNumber(data.offset, "offset");

  const normalizedLimit = limit ?? 50;
  const normalizedOffset = offset ?? 0;

  if (normalizedLimit <= 0) {
    throw new AppError("limit must be > 0", 400);
  }
  if (normalizedLimit > 200) {
    throw new AppError("limit must be <= 200", 400);
  }
  if (normalizedOffset < 0) {
    throw new AppError("offset must be >= 0", 400);
  }

  result.limit = normalizedLimit;
  result.offset = normalizedOffset;
  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(
    result,
    "segmentId",
    parseOptionalQueryString(data.segmentId, "segmentId")
  );
  addIfDefined(
    result,
    "markerId",
    parseOptionalQueryString(data.markerId, "markerId")
  );
  addIfDefined(
    result,
    "timelineId",
    parseOptionalQueryString(data.timelineId, "timelineId")
  );
  addIfDefined(
    result,
    "locationId",
    parseOptionalQueryString(data.locationId, "locationId")
  );
  addIfDefined(
    result,
    "characterId",
    parseOptionalQueryString(data.characterId, "characterId")
  );
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "type", parseOptionalQueryString(data.type, "type"));

  return result;
};

const syncParticipants = async (
  database: string,
  eventId: string,
  participants: EventParticipantInput[] | undefined
): Promise<void> => {
  if (participants === undefined) {
    return;
  }
  if (participants.length === 0) {
    await deleteEventParticipants(database, eventId);
    return;
  }
  const ids = participants.map((item) => item.characterId);
  const found = await getCharacterIds(database, ids);
  if (found.length !== ids.length) {
    throw new AppError("character not found", 404);
  }
  await updateEventParticipants(database, eventId, participants);
};

const assignMarkerFields = (
  event: EventNode,
  marker: {
    markerId: string;
    markerLabel?: string;
    markerTick?: number;
    segmentId?: string;
    segmentName?: string;
  }
) => {
  event.markerId = marker.markerId;
  if (marker.markerLabel !== undefined) {
    event.markerLabel = marker.markerLabel;
  } else {
    delete event.markerLabel;
  }
  if (marker.markerTick !== undefined) {
    event.markerTick = marker.markerTick;
    event.timelineYear = marker.markerTick;
  } else {
    delete event.markerTick;
    delete event.timelineYear;
  }
  if (marker.segmentId !== undefined) {
    event.segmentId = marker.segmentId;
    event.timelineId = marker.segmentId;
  } else {
    delete event.segmentId;
    delete event.timelineId;
  }
  if (marker.segmentName !== undefined) {
    event.segmentName = marker.segmentName;
    event.timelineName = marker.segmentName;
  } else {
    delete event.segmentName;
    delete event.timelineName;
  }
};

const clearMarkerFields = (event: EventNode) => {
  delete event.markerId;
  delete event.markerLabel;
  delete event.markerTick;
  delete event.segmentId;
  delete event.segmentName;
  delete event.timelineId;
  delete event.timelineName;
  delete event.timelineYear;
};

const syncEventMarker = async (
  database: string,
  event: EventNode,
  validated: EventInput
): Promise<void> => {
  if (validated.markerId) {
    const context = await linkEventToTimelineMarker(database, event.id, validated.markerId);
    if (!context) {
      throw new AppError("timeline marker not found", 404);
    }
    assignMarkerFields(event, context);
    await deleteLegacyEventTimelineLinks(database, event.id);
    if (validated.durationValue !== undefined) {
      event.durationValue = validated.durationValue;
    }
    if (validated.durationUnit !== undefined) {
      event.durationUnit = validated.durationUnit;
    }
    return;
  }

  if (validated.timelineId && validated.timelineYear !== undefined) {
    const segment = await getLegacySegmentByTimelineId(database, validated.timelineId);
    if (!segment) {
      throw new AppError(
        "legacy timeline is not migrated to timeline segment",
        409
      );
    }
    const markerPayload: {
      eventId: string;
      segmentId: string;
      tick: number;
      label: string;
      description?: string;
      markerType?: string;
    } = {
      eventId: event.id,
      segmentId: segment.segmentId,
      tick: validated.timelineYear,
      label: event.name,
      markerType: "event",
    };
    if (event.summary !== undefined) {
      markerPayload.description = event.summary;
    }
    const marker = await upsertEventMarkerInSegment(database, markerPayload);
    if (!marker) {
      throw new AppError("timeline segment not found", 404);
    }
    assignMarkerFields(event, marker);
    await deleteLegacyEventTimelineLinks(database, event.id);
    if (validated.durationValue !== undefined) {
      event.durationValue = validated.durationValue;
    }
    if (validated.durationUnit !== undefined) {
      event.durationUnit = validated.durationUnit;
    }
    return;
  }

  if (validated.segmentId && validated.timelineYear !== undefined) {
    const markerPayload: {
      eventId: string;
      segmentId: string;
      tick: number;
      label: string;
      description?: string;
      markerType?: string;
    } = {
      eventId: event.id,
      segmentId: validated.segmentId,
      tick: validated.timelineYear,
      label: event.name,
      markerType: "event",
    };
    if (event.summary !== undefined) {
      markerPayload.description = event.summary;
    }
    const marker = await upsertEventMarkerInSegment(database, markerPayload);
    if (!marker) {
      throw new AppError("timeline segment not found", 404);
    }
    assignMarkerFields(event, marker);
    await deleteLegacyEventTimelineLinks(database, event.id);
    return;
  }

  await unlinkEventMarkers(database, event.id);
  await deleteLegacyEventTimelineLinks(database, event.id);
  clearMarkerFields(event);
  delete event.durationValue;
  delete event.durationUnit;
};

export const eventService = {
  create: async (payload: unknown, dbName: unknown): Promise<EventNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateEventPayload(payload);
    const node = buildEventNode(validated);
    if (validated.locationId) {
      const created = await createEventWithLocation(
        node,
        validated.locationId,
        "",
        database
      );
      if (!created) {
        throw new AppError("location not found", 404);
      }
      const event: EventNode = {
        ...created.event,
        ...(created.locationName ? { locationName: created.locationName } : {}),
      };
      await syncEventMarker(database, event, validated);
      await syncParticipants(database, event.id, validated.participants);
      return event;
    }
    const created = await createEvent(node, database);
    await syncEventMarker(database, created, validated);
    await syncParticipants(database, created.id, validated.participants);
    return created;
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<EventNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateEventPayload(payload);
    const now = new Date().toISOString();
    const node: EventNode = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };
    let updated: EventNode | null = null;
    if (validated.locationId) {
      const locationName = await getLocationName(database, validated.locationId);
      if (!locationName) {
        throw new AppError("location not found", 404);
      }
      const updatedWithLocation = await updateEventWithLocation(
        node,
        validated.locationId,
        "",
        database
      );
      if (updatedWithLocation) {
        updated = {
          ...updatedWithLocation.event,
          ...(updatedWithLocation.locationName
            ? { locationName: updatedWithLocation.locationName }
            : { locationName }),
        };
      }
    } else {
      updated = await updateEvent(node, database);
      await deleteEventLocation(database, id);
    }
    if (!updated) {
      throw new AppError("event not found", 404);
    }
    await syncEventMarker(database, updated, validated);
    await syncParticipants(database, updated.id, validated.participants);
    return updated;
  },
  getAll: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: EventNode[]; meta: EventListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseEventListQuery(query);
    const [data, total] = await Promise.all([
      getEvents(database, parsedQuery),
      getEventCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteEvent(database, id);
    if (!deleted) {
      throw new AppError("event not found", 404);
    }
  },
};
