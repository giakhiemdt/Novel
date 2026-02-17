import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  assertOptionalTraitArray,
  normalizeTraitArray,
  serializeTraitArray,
} from "../../shared/utils/trait";
import {
  createRace,
  deleteRace,
  getRaceCount,
  getRaces,
  updateRace,
} from "./race.repo";
import { RaceInput, RaceListQuery, RaceNode } from "./race.types";

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

const validateRacePayload = (payload: unknown): RaceInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "alias", assertOptionalStringArray(data.alias, "alias"));
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(result, "origin", assertOptionalString(data.origin, "origin"));
  addIfDefined(result, "traits", assertOptionalTraitArray(data.traits, "traits"));
  addIfDefined(result, "culture", assertOptionalString(data.culture, "culture"));
  addIfDefined(
    result,
    "lifespan",
    assertOptionalString(data.lifespan, "lifespan")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as RaceInput;
};

const buildRaceNode = (payload: RaceInput): RaceNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeRaceForPersistence = (node: RaceNode): RaceNode => {
  const serializedTraits = serializeTraitArray(
    (node as { traits?: unknown }).traits
  );
  const { traits: _traits, ...rest } = node as RaceNode & { traits?: unknown };
  if (serializedTraits === undefined) {
    return rest as RaceNode;
  }
  return {
    ...(rest as RaceNode),
    traits: serializedTraits,
  };
};

const normalizeRaceNode = (node: RaceNode): RaceNode => {
  const normalizedTraits = normalizeTraitArray(
    (node as { traits?: unknown }).traits
  );
  const { traits: _traits, ...rest } = node as RaceNode & { traits?: unknown };
  if (normalizedTraits === undefined) {
    return rest as RaceNode;
  }
  return {
    ...(rest as RaceNode),
    traits: normalizedTraits,
  };
};

const parseRaceListQuery = (query: unknown): RaceListQuery => {
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

  const result: RaceListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "origin", parseOptionalQueryString(data.origin, "origin"));
  addIfDefined(
    result,
    "culture",
    parseOptionalQueryString(data.culture, "culture")
  );

  return result;
};

export const raceService = {
  create: async (payload: unknown, dbName: unknown): Promise<RaceNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateRacePayload(payload);
    const node = buildRaceNode(validated);
    const created = await createRace(normalizeRaceForPersistence(node), database);
    return normalizeRaceNode(created);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<RaceNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateRacePayload(payload);
    const now = new Date().toISOString();
    const node: RaceNode = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateRace(normalizeRaceForPersistence(node), database);
    if (!updated) {
      throw new AppError("race not found", 404);
    }
    return normalizeRaceNode(updated);
  },
  getAll: async (dbName: unknown): Promise<RaceNode[]> => {
    const database = assertDatabaseName(dbName);
    const rows = await getRaces(database, { limit: 50, offset: 0 });
    return rows.map(normalizeRaceNode);
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: RaceNode[]; meta: RaceListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseRaceListQuery(query);
    const [data, total] = await Promise.all([
      getRaces(database, parsedQuery),
      getRaceCount(database, parsedQuery),
    ]);
    return { data: data.map(normalizeRaceNode), meta: { ...parsedQuery, total } };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteRace(database, id);
    if (!deleted) {
      throw new AppError("race not found", 404);
    }
  },
};
