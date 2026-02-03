import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createEvent,
  createEventWithLocation,
  deleteEvent,
  deleteEventParticipants,
  deleteEventLocation,
  deleteEventTimeline,
  getCharacterIds,
  getTimelineName,
  getAllEvents,
  upsertEventTimeline,
  updateEvent,
  updateEventParticipants,
  updateEventWithLocation,
} from "./event.repo";
import { EventInput, EventNode, EventParticipantInput } from "./event.types";

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
    addIfDefined(result, "timelineYear", timelineYear);
    addIfDefined(result, "timelineMonth", timelineMonth);
    addIfDefined(result, "timelineDay", timelineDay);
    addIfDefined(result, "durationValue", durationValue);
    addIfDefined(result, "durationUnit", durationUnit);
  } else {
    addIfDefined(result, "timelineId", timelineId);
    addIfDefined(
      result,
      "timelineYear",
      assertOptionalNumber(data.timelineYear, "timelineYear")
    );
    addIfDefined(
      result,
      "timelineMonth",
      assertOptionalNumber(data.timelineMonth, "timelineMonth")
    );
    addIfDefined(
      result,
      "timelineDay",
      assertOptionalNumber(data.timelineDay, "timelineDay")
    );
    addIfDefined(
      result,
      "durationValue",
      assertOptionalNumber(data.durationValue, "durationValue")
    );
    addIfDefined(
      result,
      "durationUnit",
      assertOptionalString(data.durationUnit, "durationUnit")
    );
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
      if (validated.timelineId && validated.timelineYear !== undefined) {
        const timelineName = await getTimelineName(database, validated.timelineId);
        if (!timelineName) {
          throw new AppError("timeline not found", 404);
        }
        await upsertEventTimeline(
          database,
          event.id,
          validated.timelineId,
          validated.timelineYear,
          validated.durationValue!,
          validated.durationUnit!
        );
        event.timelineId = validated.timelineId;
        event.timelineName = timelineName;
        event.timelineYear = validated.timelineYear;
        if (validated.durationValue !== undefined) {
          event.durationValue = validated.durationValue;
        }
        if (validated.durationUnit !== undefined) {
          event.durationUnit = validated.durationUnit;
        }
      }
      await syncParticipants(database, event.id, validated.participants);
      return event;
    }
    const created = await createEvent(node, database);
    if (validated.timelineId && validated.timelineYear !== undefined) {
      const timelineName = await getTimelineName(database, validated.timelineId);
      if (!timelineName) {
        throw new AppError("timeline not found", 404);
      }
      await upsertEventTimeline(
        database,
        created.id,
        validated.timelineId,
        validated.timelineYear,
        validated.durationValue!,
        validated.durationUnit!
      );
      created.timelineId = validated.timelineId;
      created.timelineName = timelineName;
      created.timelineYear = validated.timelineYear;
      if (validated.durationValue !== undefined) {
        created.durationValue = validated.durationValue;
      }
      if (validated.durationUnit !== undefined) {
        created.durationUnit = validated.durationUnit;
      }
    }
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
            : {}),
        };
      }
    } else {
      updated = await updateEvent(node, database);
      await deleteEventLocation(database, id);
    }
    if (!updated) {
      throw new AppError("event not found", 404);
    }
    if (validated.timelineId && validated.timelineYear !== undefined) {
      const timelineName = await getTimelineName(database, validated.timelineId);
      if (!timelineName) {
        throw new AppError("timeline not found", 404);
      }
      await upsertEventTimeline(
        database,
        updated.id,
        validated.timelineId,
        validated.timelineYear,
        validated.durationValue!,
        validated.durationUnit!
      );
      updated.timelineId = validated.timelineId;
      updated.timelineName = timelineName;
      updated.timelineYear = validated.timelineYear;
      if (validated.durationValue !== undefined) {
        updated.durationValue = validated.durationValue;
      }
      if (validated.durationUnit !== undefined) {
        updated.durationUnit = validated.durationUnit;
      }
    } else {
      await deleteEventTimeline(database, updated.id);
      delete updated.timelineId;
      delete updated.timelineName;
      delete updated.timelineYear;
      delete updated.durationValue;
      delete updated.durationUnit;
    }
    await syncParticipants(database, updated.id, validated.participants);
    return updated;
  },
  getAll: async (dbName: unknown): Promise<EventNode[]> => {
    const database = assertDatabaseName(dbName);
    return getAllEvents(database);
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteEvent(database, id);
    if (!deleted) {
      throw new AppError("event not found", 404);
    }
  },
};
