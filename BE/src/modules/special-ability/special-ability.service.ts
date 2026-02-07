import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createSpecialAbility,
  deleteSpecialAbility,
  getSpecialAbilityCount,
  getSpecialAbilities,
  updateSpecialAbility,
} from "./special-ability.repo";
import {
  SpecialAbilityInput,
  SpecialAbilityListQuery,
  SpecialAbilityNode,
  SpecialAbilityType,
} from "./special-ability.types";

const TYPES: SpecialAbilityType[] = ["innate", "acquired"];

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

const assertOptionalEnum = <T extends string>(
  value: unknown,
  allowed: T[],
  field: string
): T | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new AppError(`${field} must be one of ${allowed.join(", ")}`, 400);
  }
  return value as T;
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

const validateSpecialAbilityPayload = (payload: unknown): SpecialAbilityInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "type", assertOptionalEnum(data.type, TYPES, "type"));
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as SpecialAbilityInput;
};

const buildSpecialAbilityNode = (payload: SpecialAbilityInput): SpecialAbilityNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

const parseSpecialAbilityListQuery = (query: unknown): SpecialAbilityListQuery => {
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

  const result: SpecialAbilityListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "type", assertOptionalEnum(data.type, TYPES, "type"));

  return result;
};

export const specialAbilityService = {
  create: async (payload: unknown, dbName: unknown): Promise<SpecialAbilityNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateSpecialAbilityPayload(payload);
    const node = buildSpecialAbilityNode(validated);
    return createSpecialAbility(node, database);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<SpecialAbilityNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateSpecialAbilityPayload(payload);
    const now = new Date().toISOString();
    const node: SpecialAbilityNode = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateSpecialAbility(node, database);
    if (!updated) {
      throw new AppError("special ability not found", 404);
    }
    return updated;
  },
  getAll: async (dbName: unknown): Promise<SpecialAbilityNode[]> => {
    const database = assertDatabaseName(dbName);
    return getSpecialAbilities(database, { limit: 50, offset: 0 });
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: SpecialAbilityNode[]; meta: SpecialAbilityListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseSpecialAbilityListQuery(query);
    const [data, total] = await Promise.all([
      getSpecialAbilities(database, parsedQuery),
      getSpecialAbilityCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteSpecialAbility(database, id);
    if (!deleted) {
      throw new AppError("special ability not found", 404);
    }
  },
};
