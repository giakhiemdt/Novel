import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createFaction,
  deleteFaction,
  getFactionCount,
  getFactions,
  updateFaction,
} from "./faction.repo";
import { FactionInput, FactionListQuery, FactionNode } from "./faction.types";

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

const validateFactionPayload = (payload: unknown): FactionInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "alias", assertOptionalStringArray(data.alias, "alias"));
  addIfDefined(result, "type", assertOptionalString(data.type, "type"));
  addIfDefined(
    result,
    "alignment",
    assertOptionalString(data.alignment, "alignment")
  );
  addIfDefined(
    result,
    "isPublic",
    assertOptionalBoolean(data.isPublic, "isPublic")
  );
  addIfDefined(result, "isCanon", assertOptionalBoolean(data.isCanon, "isCanon"));
  addIfDefined(result, "ideology", assertOptionalString(data.ideology, "ideology"));
  addIfDefined(result, "goal", assertOptionalString(data.goal, "goal"));
  addIfDefined(result, "doctrine", assertOptionalString(data.doctrine, "doctrine"));
  addIfDefined(result, "taboos", assertOptionalStringArray(data.taboos, "taboos"));
  addIfDefined(
    result,
    "powerLevel",
    assertOptionalNumber(data.powerLevel, "powerLevel")
  );
  addIfDefined(
    result,
    "influenceScope",
    assertOptionalString(data.influenceScope, "influenceScope")
  );
  addIfDefined(
    result,
    "militaryPower",
    assertOptionalString(data.militaryPower, "militaryPower")
  );
  addIfDefined(
    result,
    "specialAssets",
    assertOptionalStringArray(data.specialAssets, "specialAssets")
  );
  addIfDefined(
    result,
    "leadershipType",
    assertOptionalString(data.leadershipType, "leadershipType")
  );
  addIfDefined(
    result,
    "leaderTitle",
    assertOptionalString(data.leaderTitle, "leaderTitle")
  );
  addIfDefined(
    result,
    "hierarchyNote",
    assertOptionalString(data.hierarchyNote, "hierarchyNote")
  );
  addIfDefined(
    result,
    "memberPolicy",
    assertOptionalString(data.memberPolicy, "memberPolicy")
  );
  addIfDefined(
    result,
    "foundingStory",
    assertOptionalString(data.foundingStory, "foundingStory")
  );
  addIfDefined(
    result,
    "ageEstimate",
    assertOptionalString(data.ageEstimate, "ageEstimate")
  );
  addIfDefined(
    result,
    "majorConflicts",
    assertOptionalStringArray(data.majorConflicts, "majorConflicts")
  );
  addIfDefined(
    result,
    "reputation",
    assertOptionalString(data.reputation, "reputation")
  );
  addIfDefined(
    result,
    "currentStatus",
    assertOptionalString(data.currentStatus, "currentStatus")
  );
  addIfDefined(
    result,
    "currentStrategy",
    assertOptionalString(data.currentStrategy, "currentStrategy")
  );
  addIfDefined(
    result,
    "knownEnemies",
    assertOptionalStringArray(data.knownEnemies, "knownEnemies")
  );
  addIfDefined(
    result,
    "knownAllies",
    assertOptionalStringArray(data.knownAllies, "knownAllies")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as FactionInput;
};

const buildFactionNode = (payload: FactionInput): FactionNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

const parseFactionListQuery = (query: unknown): FactionListQuery => {
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

  const result: FactionListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "type", parseOptionalQueryString(data.type, "type"));
  addIfDefined(
    result,
    "alignment",
    parseOptionalQueryString(data.alignment, "alignment")
  );
  addIfDefined(
    result,
    "isPublic",
    parseOptionalQueryBoolean(data.isPublic, "isPublic")
  );
  addIfDefined(
    result,
    "isCanon",
    parseOptionalQueryBoolean(data.isCanon, "isCanon")
  );

  return result;
};

export const factionService = {
  create: async (payload: unknown, dbName: unknown): Promise<FactionNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateFactionPayload(payload);
    const node = buildFactionNode(validated);
    return createFaction(node, database);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<FactionNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateFactionPayload(payload);
    const now = new Date().toISOString();
    const node: FactionNode = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateFaction(node, database);
    if (!updated) {
      throw new AppError("faction not found", 404);
    }
    return updated;
  },
  getAll: async (dbName: unknown): Promise<FactionNode[]> => {
    const database = assertDatabaseName(dbName);
    return getFactions(database, { limit: 50, offset: 0 });
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: FactionNode[]; meta: FactionListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseFactionListQuery(query);
    const [data, total] = await Promise.all([
      getFactions(database, parsedQuery),
      getFactionCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteFaction(database, id);
    if (!deleted) {
      throw new AppError("faction not found", 404);
    }
  },
};
