import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createRankSystem,
  deleteRankSystem,
  getRankSystemCount,
  getRankSystems,
  rankSystemExists,
  updateRankSystem,
} from "./rank-system.repo";
import { getRankCount, getRanks } from "../rank/rank.repo";
import {
  RankSystemInput,
  RankSystemListQuery,
  RankSystemNode,
} from "./rank-system.types";
import { RankListQuery, RankNode } from "../rank/rank.types";
import { getEnergyTypeById } from "../energy-type/energy-type.repo";

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

const validateRankSystemPayload = (payload: unknown): RankSystemInput => {
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
  addIfDefined(result, "domain", assertOptionalString(data.domain, "domain"));
  addIfDefined(
    result,
    "energyTypeId",
    assertOptionalString(data.energyTypeId, "energyTypeId")
  );
  addIfDefined(result, "priority", assertOptionalNumber(data.priority, "priority"));
  addIfDefined(result, "isPrimary", assertOptionalBoolean(data.isPrimary, "isPrimary"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as RankSystemInput;
};

const parseRankSystemListQuery = (query: unknown): RankSystemListQuery => {
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

  const result: RankSystemListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "domain", parseOptionalQueryString(data.domain, "domain"));
  addIfDefined(
    result,
    "energyTypeId",
    parseOptionalQueryString(data.energyTypeId, "energyTypeId")
  );

  return result;
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

export const rankSystemService = {
  create: async (payload: unknown, dbName: unknown): Promise<RankSystemNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateRankSystemPayload(payload);
    let resolvedEnergyTypeName: string | undefined = undefined;
    if (validated.energyTypeId) {
      const energyType = await getEnergyTypeById(database, validated.energyTypeId);
      if (!energyType) {
        throw new AppError("energy type not found", 404);
      }
      resolvedEnergyTypeName = energyType.name;
    }
    const now = new Date().toISOString();
    const node: RankSystemNode = {
      ...validated,
      id: validated.id ?? generateId(),
      isPrimary: validated.isPrimary ?? false,
      createdAt: now,
      updatedAt: now,
    };
    if (resolvedEnergyTypeName !== undefined) {
      node.energyType = resolvedEnergyTypeName;
    }
    return createRankSystem(node, database);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<RankSystemNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateRankSystemPayload(payload);
    let resolvedEnergyTypeName: string | undefined = undefined;
    if (validated.energyTypeId) {
      const energyType = await getEnergyTypeById(database, validated.energyTypeId);
      if (!energyType) {
        throw new AppError("energy type not found", 404);
      }
      resolvedEnergyTypeName = energyType.name;
    }
    const now = new Date().toISOString();
    const node: RankSystemNode = {
      ...validated,
      id,
      isPrimary: validated.isPrimary ?? false,
      createdAt: now,
      updatedAt: now,
    };
    if (resolvedEnergyTypeName !== undefined) {
      node.energyType = resolvedEnergyTypeName;
    }
    const updated = await updateRankSystem(node, database);
    if (!updated) {
      throw new AppError("rank system not found", 404);
    }
    return updated;
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: RankSystemNode[]; meta: RankSystemListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseRankSystemListQuery(query);
    const [data, total] = await Promise.all([
      getRankSystems(database, parsedQuery),
      getRankSystemCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },
  getRanksBySystem: async (
    dbName: unknown,
    systemId: string,
    query: unknown
  ): Promise<{ data: RankNode[]; meta: RankListQuery }> => {
    const database = assertDatabaseName(dbName);
    const normalizedSystemId = assertRequiredString(systemId, "systemId");
    const exists = await rankSystemExists(database, normalizedSystemId);
    if (!exists) {
      throw new AppError("rank system not found", 404);
    }
    const parsedQuery = parseRankListQuery(query);
    const scopedQuery: RankListQuery = {
      ...parsedQuery,
      systemId: normalizedSystemId,
    };
    const [data, total] = await Promise.all([
      getRanks(database, scopedQuery),
      getRankCount(database, scopedQuery),
    ]);
    return {
      data,
      meta: { ...parsedQuery, systemId: normalizedSystemId, total },
    };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteRankSystem(database, id);
    if (!deleted) {
      throw new AppError("rank system not found", 404);
    }
  },
};
