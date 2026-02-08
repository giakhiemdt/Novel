import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createMapSystem,
  deleteMapSystem,
  getMapSystemCount,
  getMapSystems,
  updateMapSystem,
} from "./map-system.repo";
import {
  MapSystemInput,
  MapSystemListQuery,
  MapSystemNode,
} from "./map-system.types";

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

const assertOptionalNumber = (
  value: unknown,
  field: string
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError(`${field} must be a number`, 400);
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

const addIfDefined = (
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void => {
  if (value !== undefined) {
    target[key] = value;
  }
};

const validateMapSystemPayload = (payload: unknown): MapSystemInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "code", assertOptionalString(data.code, "code"));
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(result, "scope", assertOptionalString(data.scope, "scope"));
  addIfDefined(result, "seed", assertOptionalString(data.seed, "seed"));
  addIfDefined(result, "width", assertOptionalNumber(data.width, "width"));
  addIfDefined(result, "height", assertOptionalNumber(data.height, "height"));
  addIfDefined(
    result,
    "seaLevel",
    assertOptionalNumber(data.seaLevel, "seaLevel")
  );
  addIfDefined(
    result,
    "climatePreset",
    assertOptionalString(data.climatePreset, "climatePreset")
  );
  addIfDefined(result, "config", assertOptionalString(data.config, "config"));
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  if (typeof result.width === "number" && result.width <= 0) {
    throw new AppError("width must be > 0", 400);
  }
  if (typeof result.height === "number" && result.height <= 0) {
    throw new AppError("height must be > 0", 400);
  }
  if (
    typeof result.seaLevel === "number" &&
    (result.seaLevel < 0 || result.seaLevel > 1)
  ) {
    throw new AppError("seaLevel must be between 0 and 1", 400);
  }

  return result as MapSystemInput;
};

const parseMapSystemListQuery = (query: unknown): MapSystemListQuery => {
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

  const result: MapSystemListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "code", parseOptionalQueryString(data.code, "code"));
  addIfDefined(result, "scope", parseOptionalQueryString(data.scope, "scope"));

  return result;
};

export const mapSystemService = {
  create: async (payload: unknown, dbName: unknown): Promise<MapSystemNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateMapSystemPayload(payload);
    const now = new Date().toISOString();
    const node: MapSystemNode = {
      ...validated,
      id: validated.id ?? generateId(),
      createdAt: now,
      updatedAt: now,
    };
    return createMapSystem(node, database);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<MapSystemNode> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const validated = validateMapSystemPayload(payload);
    const now = new Date().toISOString();
    const node: MapSystemNode = {
      ...validated,
      id: normalizedId,
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateMapSystem(node, database);
    if (!updated) {
      throw new AppError("map system not found", 404);
    }
    return updated;
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: MapSystemNode[]; meta: MapSystemListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseMapSystemListQuery(query);
    const [data, total] = await Promise.all([
      getMapSystems(database, parsedQuery),
      getMapSystemCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const deleted = await deleteMapSystem(database, normalizedId);
    if (!deleted) {
      throw new AppError("map system not found", 404);
    }
  },
};
