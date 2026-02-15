import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  attachRankToSystem,
  createRank,
  deleteRank,
  getRankBoardLayout,
  getRankCount,
  getRanks,
  linkRank,
  rankSystemExists,
  saveRankBoardLayout,
  unlinkRank,
  updateRankLinkConditions,
  updateRank,
} from "./rank.repo";
import {
  RankBoardLayout,
  RankCondition,
  RankInput,
  RankListQuery,
  RankNode,
} from "./rank.types";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

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

const parseRankCondition = (value: unknown, field: string): RankCondition => {
  if (typeof value === "string") {
    const name = value.trim();
    if (!name) {
      throw new AppError(`${field}.name is required`, 400);
    }
    return { name };
  }
  if (!isObject(value)) {
    throw new AppError(`${field} must be an object`, 400);
  }
  const nameRaw = value.name;
  if (typeof nameRaw !== "string" || !nameRaw.trim()) {
    throw new AppError(`${field}.name is required`, 400);
  }
  const descriptionRaw = value.description;
  if (descriptionRaw !== undefined && typeof descriptionRaw !== "string") {
    throw new AppError(`${field}.description must be a string`, 400);
  }
  const name = nameRaw.trim();
  const description = descriptionRaw?.trim();
  if (description && description.length > 0) {
    return { name, description };
  }
  return { name };
};

const assertOptionalConditionArray = (
  value: unknown,
  field: string
): RankCondition[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new AppError(`${field} must be an array`, 400);
  }
  return value.map((item, index) => parseRankCondition(item, `${field}[${index}]`));
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

const parseBoardLayoutPositions = (
  value: unknown
): Record<string, { x: number; y: number }> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("positions must be an object", 400);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 5000) {
    throw new AppError("positions contains too many entries", 400);
  }
  const positions: Record<string, { x: number; y: number }> = {};
  entries.forEach(([id, pos]) => {
    if (!pos || typeof pos !== "object" || Array.isArray(pos)) {
      throw new AppError(`positions.${id} must be an object`, 400);
    }
    const point = pos as Record<string, unknown>;
    if (
      typeof point.x !== "number" ||
      typeof point.y !== "number" ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    ) {
      throw new AppError(`positions.${id} must contain finite x/y numbers`, 400);
    }
    positions[id] = { x: point.x, y: point.y };
  });
  return positions;
};

const parseBoardLayoutLinkBends = (
  value: unknown
): Record<string, { midX: number }> => {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("linkBends must be an object", 400);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 5000) {
    throw new AppError("linkBends contains too many entries", 400);
  }
  const linkBends: Record<string, { midX: number }> = {};
  entries.forEach(([id, bend]) => {
    if (!bend || typeof bend !== "object" || Array.isArray(bend)) {
      throw new AppError(`linkBends.${id} must be an object`, 400);
    }
    const point = bend as Record<string, unknown>;
    if (typeof point.midX !== "number" || !Number.isFinite(point.midX)) {
      throw new AppError(`linkBends.${id}.midX must be a finite number`, 400);
    }
    linkBends[id] = { midX: point.midX };
  });
  return linkBends;
};

const parseBoardLayoutConditionNodePositions = (
  value: unknown
): Record<string, { x: number; y: number }> => {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("conditionNodePositions must be an object", 400);
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 5000) {
    throw new AppError("conditionNodePositions contains too many entries", 400);
  }
  const positions: Record<string, { x: number; y: number }> = {};
  entries.forEach(([id, pos]) => {
    if (!pos || typeof pos !== "object" || Array.isArray(pos)) {
      throw new AppError(`conditionNodePositions.${id} must be an object`, 400);
    }
    const point = pos as Record<string, unknown>;
    if (
      typeof point.x !== "number" ||
      typeof point.y !== "number" ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    ) {
      throw new AppError(
        `conditionNodePositions.${id} must contain finite x/y numbers`,
        400
      );
    }
    positions[id] = { x: point.x, y: point.y };
  });
  return positions;
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
  addIfDefined(
    result,
    "systemId",
    assertOptionalString(data.systemId, "systemId")
  );
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
  addIfDefined(result, "color", assertOptionalString(data.color, "color"));

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
  addIfDefined(
    result,
    "systemId",
    parseOptionalQueryString(data.systemId, "systemId")
  );

  return result;
};

export const rankService = {
  create: async (payload: unknown, dbName: unknown): Promise<RankNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateRankPayload(payload);
    if (validated.systemId) {
      const exists = await rankSystemExists(database, validated.systemId);
      if (!exists) {
        throw new AppError("rank system not found", 404);
      }
    }
    const node = buildRankNode(validated);
    const created = await createRank(node, database);
    if (validated.systemId && created.id) {
      await attachRankToSystem(database, created.id, validated.systemId);
    }
    return created;
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<RankNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateRankPayload(payload);
    if (validated.systemId) {
      const exists = await rankSystemExists(database, validated.systemId);
      if (!exists) {
        throw new AppError("rank system not found", 404);
      }
    }
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
    if (validated.systemId) {
      await attachRankToSystem(database, id, validated.systemId);
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
    const [data, total] = await Promise.all([
      getRanks(database, parsedQuery),
      getRankCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
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
    const conditions = assertOptionalConditionArray(
      data.conditions,
      "conditions"
    );
    try {
      await linkRank(database, currentId, previousId, conditions ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid rank link";
      if (message.includes("not found")) {
        throw new AppError(message, 404);
      }
      if (
        message.includes("cycle") ||
        message.includes("cannot link to itself")
      ) {
        throw new AppError(message, 400);
      }
      throw error;
    }
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
  updateLinkConditions: async (
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
    const conditions = assertOptionalConditionArray(
      data.conditions,
      "conditions"
    );
    const updated = await updateRankLinkConditions(
      database,
      currentId,
      previousId,
      conditions ?? []
    );
    if (!updated) {
      throw new AppError("rank link not found", 404);
    }
    return { message: "updated" };
  },
  getBoardLayout: async (dbName: unknown): Promise<RankBoardLayout> => {
    const database = assertDatabaseName(dbName);
    return getRankBoardLayout(database);
  },
  saveBoardLayout: async (
    dbName: unknown,
    payload: unknown
  ): Promise<RankBoardLayout> => {
    const database = assertDatabaseName(dbName);
    if (!payload || typeof payload !== "object") {
      throw new AppError("payload must be an object", 400);
    }
    const data = payload as Record<string, unknown>;
    const positions = parseBoardLayoutPositions(data.positions);
    const linkBends = parseBoardLayoutLinkBends(data.linkBends);
    const conditionNodePositions = parseBoardLayoutConditionNodePositions(
      data.conditionNodePositions
    );
    return saveRankBoardLayout(
      database,
      positions,
      linkBends,
      conditionNodePositions
    );
  },
};
