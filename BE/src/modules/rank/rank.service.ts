import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createRank,
  deleteRank,
  getRanks,
  linkRank,
  unlinkRank,
  updateRank,
} from "./rank.repo";
import { RankInput, RankListQuery, RankNode } from "./rank.types";

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

const validateRankPayload = (payload: unknown): RankInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "alias", assertOptionalStringArray(data.alias, "alias"));
  addIfDefined(result, "tier", assertOptionalString(data.tier, "tier"));
  addIfDefined(result, "system", assertOptionalString(data.system, "system"));
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as RankInput;
};

const assertRequiredId = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`${field} is required`, 400);
  }
  return value.trim();
};

const buildRankNode = (payload: RankInput): RankNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

const parseRankListQuery = (query: unknown): RankListQuery => {
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

  const result: RankListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "tier", parseOptionalQueryString(data.tier, "tier"));
  addIfDefined(result, "system", parseOptionalQueryString(data.system, "system"));

  return result;
};

export const rankService = {
  create: async (payload: unknown, dbName: unknown): Promise<RankNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateRankPayload(payload);
    const node = buildRankNode(validated);
    return createRank(node, database);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<RankNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateRankPayload(payload);
    const now = new Date().toISOString();
    const node: RankNode = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateRank(node, database);
    if (!updated) {
      throw new AppError("rank not found", 404);
    }
    return updated;
  },
  getAll: async (dbName: unknown): Promise<RankNode[]> => {
    const database = assertDatabaseName(dbName);
    return getRanks(database, { limit: 50, offset: 0 });
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: RankNode[]; meta: RankListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseRankListQuery(query);
    const data = await getRanks(database, parsedQuery);
    return { data, meta: parsedQuery };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteRank(database, id);
    if (!deleted) {
      throw new AppError("rank not found", 404);
    }
  },
  link: async (
    dbName: unknown,
    payload: unknown
  ): Promise<{ message: string }> => {
    const database = assertDatabaseName(dbName);
    if (!payload || typeof payload !== "object") {
      throw new AppError("payload must be an object", 400);
    }
    const data = payload as Record<string, unknown>;
    const currentId = assertRequiredId(data.currentId, "currentId");
    const previousId = assertRequiredId(data.previousId, "previousId");
    const conditions = assertOptionalStringArray(
      data.conditions,
      "conditions"
    );
    await linkRank(database, currentId, previousId, conditions ?? []);
    return { message: "linked" };
  },
  unlink: async (
    dbName: unknown,
    payload: unknown
  ): Promise<{ message: string }> => {
    const database = assertDatabaseName(dbName);
    if (!payload || typeof payload !== "object") {
      throw new AppError("payload must be an object", 400);
    }
    const data = payload as Record<string, unknown>;
    const currentId = assertRequiredId(data.currentId, "currentId");
    const previousId = assertRequiredId(data.previousId, "previousId");
    await unlinkRank(database, currentId, previousId);
    return { message: "unlinked" };
  },
};
