import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import { createTimeline, linkTimeline, unlinkTimeline } from "./timeline.repo";
import { TimelineInput, TimelineNode } from "./timeline.types";

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
  const startYear = assertRequiredNumber(data.startYear, "startYear");
  const endYear = assertRequiredNumber(data.endYear, "endYear");
  if (endYear < startYear) {
    throw new AppError("endYear must be >= startYear", 400);
  }

  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
    startYear,
    endYear,
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
    durationYears: payload.endYear - payload.startYear,
    isOngoing: payload.isOngoing ?? false,
    createdAt: now,
    updatedAt: now,
  };
};

export const timelineService = {
  create: async (payload: unknown): Promise<Omit<TimelineNode, "previousId" | "nextId">> => {
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
      return await createTimeline(node, validated.previousId, validated.nextId);
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
  link: async (payload: unknown): Promise<void> => {
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
      await linkTimeline(currentId, previousId, nextId);
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
  unlink: async (payload: unknown): Promise<void> => {
    if (!payload || typeof payload !== "object") {
      throw new AppError("payload must be an object", 400);
    }

    const data = payload as Record<string, unknown>;
    const currentId = assertRequiredString(data.currentId, "currentId");
    const previousId = assertOptionalString(data.previousId, "previousId");
    const nextId = assertOptionalString(data.nextId, "nextId");

    try {
      await unlinkTimeline(currentId, previousId, nextId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unlink timeline";
      if (message.includes("not found")) {
        throw new AppError(message, 404);
      }
      throw new AppError(message, 500);
    }
  },
  relink: async (payload: unknown): Promise<void> => {
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
      await unlinkTimeline(currentId);
      await linkTimeline(currentId, previousId, nextId);
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
};
