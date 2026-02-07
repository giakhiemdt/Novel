import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createTimeline,
  deleteTimeline,
  getTimelineCount,
  getTimelines,
  linkTimeline,
  unlinkTimeline,
} from "./timeline.repo";
import { TimelineInput, TimelineListQuery, TimelineNode } from "./timeline.types";

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
  return value;
};

const assertRequiredNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError(`${field} is required`, 400);
  }
  return value;
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

const parseOptionalQueryBoolean = (
  value: unknown,
  field: string
): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    throw new AppError(`${field} must be a boolean`, 400);
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  throw new AppError(`${field} must be a boolean`, 400);
};
const assertOptionalBoolean = (
  value: unknown,
  field: string
): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "boolean") {
    throw new AppError(`${field} must be a boolean`, 400);
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

const validateTimelinePayload = (payload: unknown): TimelineInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const durationYears = assertRequiredNumber(data.durationYears, "durationYears");
  if (durationYears <= 0) {
    throw new AppError("durationYears must be > 0", 400);
  }

  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
    durationYears,
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "code", assertOptionalString(data.code, "code"));
  addIfDefined(
    result,
    "isOngoing",
    assertOptionalBoolean(data.isOngoing, "isOngoing")
  );
  addIfDefined(result, "summary", assertOptionalString(data.summary, "summary"));
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(
    result,
    "characteristics",
    assertOptionalStringArray(data.characteristics, "characteristics")
  );
  addIfDefined(
    result,
    "dominantForces",
    assertOptionalStringArray(data.dominantForces, "dominantForces")
  );
  addIfDefined(
    result,
    "technologyLevel",
    assertOptionalString(data.technologyLevel, "technologyLevel")
  );
  addIfDefined(
    result,
    "powerEnvironment",
    assertOptionalString(data.powerEnvironment, "powerEnvironment")
  );
  addIfDefined(
    result,
    "worldState",
    assertOptionalString(data.worldState, "worldState")
  );
  addIfDefined(
    result,
    "majorChanges",
    assertOptionalStringArray(data.majorChanges, "majorChanges")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));
  addIfDefined(
    result,
    "previousId",
    assertOptionalString(data.previousId, "previousId")
  );
  addIfDefined(result, "nextId", assertOptionalString(data.nextId, "nextId"));

  return result as TimelineInput;
};

const buildTimelineNode = (
  payload: TimelineInput
): Omit<TimelineNode, "previousId" | "nextId"> => {
  const now = new Date().toISOString();
  const { previousId, nextId, ...nodePayload } = payload;
  return {
    ...nodePayload,
    id: payload.id ?? generateId(),
    durationYears: payload.durationYears,
    isOngoing: payload.isOngoing ?? false,
    createdAt: now,
    updatedAt: now,
  };
};

const parseTimelineListQuery = (query: unknown): TimelineListQuery => {
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

  const result: TimelineListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "code", parseOptionalQueryString(data.code, "code"));
  addIfDefined(
    result,
    "isOngoing",
    parseOptionalQueryBoolean(data.isOngoing, "isOngoing")
  );

  return result;
};

export const timelineService = {
  create: async (
    payload: unknown,
    dbName: unknown
  ): Promise<Omit<TimelineNode, "previousId" | "nextId">> => {
    const database = assertDatabaseName(dbName);
    const validated = validateTimelinePayload(payload);
    const node = buildTimelineNode(validated);

    if (
      validated.previousId &&
      validated.nextId &&
      validated.previousId === validated.nextId
    ) {
      throw new AppError("previousId and nextId must be different", 400);
    }

    try {
      return await createTimeline(
        node,
        database,
        validated.previousId,
        validated.nextId
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create timeline";
      if (message.includes("not found")) {
        throw new AppError(message, 404);
      }
      if (message.includes("already has")) {
        throw new AppError(message, 409);
      }
      throw new AppError(message, 500);
    }
  },
  getAll: async (dbName: unknown): Promise<TimelineNode[]> => {
    const database = assertDatabaseName(dbName);
    return getTimelines(database, { limit: 50, offset: 0 });
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: TimelineNode[]; meta: TimelineListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseTimelineListQuery(query);
    const [data, total] = await Promise.all([
      getTimelines(database, parsedQuery),
      getTimelineCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },
  link: async (payload: unknown, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    if (!payload || typeof payload !== "object") {
      throw new AppError("payload must be an object", 400);
    }

    const data = payload as Record<string, unknown>;
    const currentId = assertRequiredString(data.currentId, "currentId");
    const previousId = assertOptionalString(data.previousId, "previousId");
    const nextId = assertOptionalString(data.nextId, "nextId");

    if (!previousId && !nextId) {
      throw new AppError("previousId or nextId is required", 400);
    }
    if (previousId && previousId === currentId) {
      throw new AppError("previousId must be different from currentId", 400);
    }
    if (nextId && nextId === currentId) {
      throw new AppError("nextId must be different from currentId", 400);
    }
    if (previousId && nextId && previousId === nextId) {
      throw new AppError("previousId and nextId must be different", 400);
    }

    try {
      await linkTimeline(database, currentId, previousId, nextId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to link timeline";
      if (message.includes("not found")) {
        throw new AppError(message, 404);
      }
      if (message.includes("already has")) {
        throw new AppError(message, 409);
      }
      throw new AppError(message, 500);
    }
  },
  unlink: async (payload: unknown, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    if (!payload || typeof payload !== "object") {
      throw new AppError("payload must be an object", 400);
    }

    const data = payload as Record<string, unknown>;
    const currentId = assertRequiredString(data.currentId, "currentId");
    const previousId = assertOptionalString(data.previousId, "previousId");
    const nextId = assertOptionalString(data.nextId, "nextId");

    try {
      await unlinkTimeline(database, currentId, previousId, nextId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unlink timeline";
      if (message.includes("not found")) {
        throw new AppError(message, 404);
      }
      throw new AppError(message, 500);
    }
  },
  relink: async (payload: unknown, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    if (!payload || typeof payload !== "object") {
      throw new AppError("payload must be an object", 400);
    }

    const data = payload as Record<string, unknown>;
    const currentId = assertRequiredString(data.currentId, "currentId");
    const previousId = assertOptionalString(data.previousId, "previousId");
    const nextId = assertOptionalString(data.nextId, "nextId");

    if (!previousId && !nextId) {
      throw new AppError("previousId or nextId is required", 400);
    }
    if (previousId && previousId === currentId) {
      throw new AppError("previousId must be different from currentId", 400);
    }
    if (nextId && nextId === currentId) {
      throw new AppError("nextId must be different from currentId", 400);
    }
    if (previousId && nextId && previousId === nextId) {
      throw new AppError("previousId and nextId must be different", 400);
    }

    try {
      await unlinkTimeline(database, currentId);
      await linkTimeline(database, currentId, previousId, nextId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to relink timeline";
      if (message.includes("not found")) {
        throw new AppError(message, 404);
      }
      if (message.includes("already has")) {
        throw new AppError(message, 409);
      }
      throw new AppError(message, 500);
    }
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteTimeline(database, id);
    if (!deleted) {
      throw new AppError("timeline not found", 404);
    }
  },
};
