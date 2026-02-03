import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createContainsLink,
  createLocation,
  deleteLocation,
  deleteContainsLink,
  getAllLocations,
  updateLocation,
} from "./location.repo";
import { LocationInput, LocationNode } from "./location.types";

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

const TYPE_LEVELS: Record<string, number> = {
  "LEVEL 1 - STRUCTURE": 1,
  "LEVEL 2 - COMPLEX": 2,
  "LEVEL 3 - SETTLEMENT": 3,
  "LEVEL 4 - REGION": 4,
  "LEVEL 5 - TERRITORY": 5,
  "LEVEL 6 - WORLD SCALE": 6,
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

const validateLocationPayload = (payload: unknown): LocationInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "alias", assertOptionalStringArray(data.alias, "alias"));
  addIfDefined(result, "type", assertRequiredString(data.type, "type"));
  addIfDefined(
    result,
    "typeDetail",
    assertOptionalString(data.typeDetail, "typeDetail")
  );
  addIfDefined(result, "category", assertOptionalString(data.category, "category"));
  addIfDefined(
    result,
    "isHabitable",
    assertOptionalBoolean(data.isHabitable, "isHabitable")
  );
  addIfDefined(result, "isSecret", assertOptionalBoolean(data.isSecret, "isSecret"));
  addIfDefined(result, "terrain", assertOptionalString(data.terrain, "terrain"));
  addIfDefined(result, "climate", assertOptionalString(data.climate, "climate"));
  addIfDefined(
    result,
    "environment",
    assertOptionalString(data.environment, "environment")
  );
  addIfDefined(
    result,
    "naturalResources",
    assertOptionalStringArray(data.naturalResources, "naturalResources")
  );
  addIfDefined(
    result,
    "powerDensity",
    assertOptionalString(data.powerDensity, "powerDensity")
  );
  addIfDefined(
    result,
    "dangerLevel",
    assertOptionalNumber(data.dangerLevel, "dangerLevel")
  );
  addIfDefined(
    result,
    "anomalies",
    assertOptionalStringArray(data.anomalies, "anomalies")
  );
  addIfDefined(
    result,
    "restrictions",
    assertOptionalStringArray(data.restrictions, "restrictions")
  );
  addIfDefined(
    result,
    "historicalSummary",
    assertOptionalString(data.historicalSummary, "historicalSummary")
  );
  addIfDefined(result, "legend", assertOptionalString(data.legend, "legend"));
  addIfDefined(
    result,
    "ruinsOrigin",
    assertOptionalString(data.ruinsOrigin, "ruinsOrigin")
  );
  addIfDefined(
    result,
    "currentStatus",
    assertOptionalString(data.currentStatus, "currentStatus")
  );
  addIfDefined(
    result,
    "controlledBy",
    assertOptionalString(data.controlledBy, "controlledBy")
  );
  addIfDefined(
    result,
    "populationNote",
    assertOptionalString(data.populationNote, "populationNote")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as LocationInput;
};

const buildLocationNode = (payload: LocationInput): LocationNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

export const locationService = {
  create: async (payload: unknown, dbName: unknown): Promise<LocationNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateLocationPayload(payload);
    const node = buildLocationNode(validated);
    return createLocation(node, database);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<LocationNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateLocationPayload(payload);
    const now = new Date().toISOString();
    const node: LocationNode = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateLocation(node, database);
    if (!updated) {
      throw new AppError("location not found", 404);
    }
    return updated;
  },
  getAll: async (dbName: unknown): Promise<LocationNode[]> => {
    const database = assertDatabaseName(dbName);
    return getAllLocations(database);
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteLocation(database, id);
    if (!deleted) {
      throw new AppError("location not found", 404);
    }
  },
  createContains: async (
    payload: unknown,
    dbName: unknown
  ): Promise<void> => {
    const database = assertDatabaseName(dbName);
    if (!payload || typeof payload !== "object") {
      throw new AppError("payload must be an object", 400);
    }
    const data = payload as Record<string, unknown>;
    const parentId = assertRequiredString(data.parentId, "parentId");
    const childId = assertRequiredString(data.childId, "childId");
    if (parentId === childId) {
      throw new AppError("parentId must be different from childId", 400);
    }

    const sinceYear =
      data.sinceYear === null
        ? null
        : assertOptionalNumber(data.sinceYear, "sinceYear") ?? null;
    const untilYear =
      data.untilYear === null
        ? null
        : assertOptionalNumber(data.untilYear, "untilYear") ?? null;
    const note =
      data.note === null ? null : assertOptionalString(data.note, "note") ?? null;

    if (sinceYear !== null && untilYear !== null && untilYear < sinceYear) {
      throw new AppError("untilYear must be >= sinceYear", 400);
    }

    const locations = await getAllLocations(database);
    const parent = locations.find((item) => item.id === parentId);
    const child = locations.find((item) => item.id === childId);
    if (!parent || !child) {
      throw new AppError("location not found", 404);
    }
    const parentLevel = parent.type ? TYPE_LEVELS[parent.type] : undefined;
    const childLevel = child.type ? TYPE_LEVELS[child.type] : undefined;
    if (!parentLevel || !childLevel) {
      throw new AppError("type is required for both locations", 400);
    }
    if (parentLevel < childLevel) {
      throw new AppError("parent type must be >= child type", 400);
    }

    try {
      await createContainsLink(database, parentId, childId, sinceYear, untilYear, note);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to link locations";
      if (message.includes("not found")) {
        throw new AppError(message, 404);
      }
      if (message.includes("already has")) {
        throw new AppError(message, 409);
      }
      throw new AppError(message, 500);
    }
  },
  deleteContains: async (
    payload: unknown,
    dbName: unknown
  ): Promise<void> => {
    const database = assertDatabaseName(dbName);
    if (!payload || typeof payload !== "object") {
      throw new AppError("payload must be an object", 400);
    }
    const data = payload as Record<string, unknown>;
    const childId = assertRequiredString(data.childId, "childId");
    const parentId = assertOptionalString(data.parentId, "parentId");
    if (parentId && parentId === childId) {
      throw new AppError("parentId must be different from childId", 400);
    }

    await deleteContainsLink(database, childId, parentId);
  },
};
