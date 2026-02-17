import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createRule,
  deleteRule,
  getRuleCount,
  getRules,
  updateRule,
} from "./worldrule.repo";
import {
  WorldRuleInput,
  WorldRuleListQuery,
  WorldRuleNode,
  WorldRuleStatus,
} from "./worldrule.types";

const STATUSES: WorldRuleStatus[] = ["draft", "active", "deprecated"];

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
  return value.trim();
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

const assertOptionalScopeList = (value: unknown): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new AppError("scope must be an array of strings", 400);
  }
  const normalized = value
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (normalized.length === 0) {
    return undefined;
  }
  return Array.from(new Set(normalized));
};

const assertOptionalStringList = (
  value: unknown,
  field: string
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new AppError(`${field} must be an array of strings`, 400);
  }
  const normalized = value
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (normalized.length === 0) {
    return undefined;
  }
  return Array.from(new Set(normalized));
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

const validateRulePayload = (payload: unknown): WorldRuleInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    title: assertRequiredString(data.title, "title"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "ruleCode", assertOptionalString(data.ruleCode, "ruleCode"));
  addIfDefined(result, "tldr", assertOptionalString(data.tldr, "tldr"));
  addIfDefined(result, "category", assertOptionalString(data.category, "category"));
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(result, "scope", assertOptionalScopeList(data.scope));
  addIfDefined(
    result,
    "timelineIds",
    assertOptionalStringList(data.timelineIds, "timelineIds")
  );
  addIfDefined(
    result,
    "triggerConditions",
    assertOptionalStringList(data.triggerConditions, "triggerConditions")
  );
  addIfDefined(
    result,
    "coreRules",
    assertOptionalStringList(data.coreRules, "coreRules")
  );
  addIfDefined(
    result,
    "consequences",
    assertOptionalStringList(data.consequences, "consequences")
  );
  addIfDefined(
    result,
    "examples",
    assertOptionalStringList(data.examples, "examples")
  );
  addIfDefined(
    result,
    "relatedRuleCodes",
    assertOptionalStringList(data.relatedRuleCodes, "relatedRuleCodes")
  );
  addIfDefined(
    result,
    "constraints",
    assertOptionalString(data.constraints, "constraints")
  );
  addIfDefined(
    result,
    "exceptions",
    assertOptionalString(data.exceptions, "exceptions")
  );
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, STATUSES, "status")
  );
  addIfDefined(result, "version", assertOptionalString(data.version, "version"));
  addIfDefined(
    result,
    "validFrom",
    assertOptionalNumber(data.validFrom, "validFrom")
  );
  addIfDefined(
    result,
    "validTo",
    assertOptionalNumber(data.validTo, "validTo")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  const validFrom = result.validFrom as number | undefined;
  const validTo = result.validTo as number | undefined;
  if (validFrom !== undefined && validTo !== undefined && validTo < validFrom) {
    throw new AppError("validTo must be >= validFrom", 400);
  }

  return result as WorldRuleInput;
};

const buildRuleNode = (payload: WorldRuleInput): WorldRuleNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    status: payload.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  };
};

const parseRuleListQuery = (query: unknown): WorldRuleListQuery => {
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

  const status = parseOptionalQueryString(data.status, "status");
  if (status && !STATUSES.includes(status as WorldRuleStatus)) {
    throw new AppError(`status must be one of ${STATUSES.join(", ")}`, 400);
  }

  const result: WorldRuleListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "title", parseOptionalQueryString(data.title, "title"));
  addIfDefined(
    result,
    "category",
    parseOptionalQueryString(data.category, "category")
  );
  addIfDefined(result, "scope", parseOptionalQueryString(data.scope, "scope"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "status", status as WorldRuleStatus | undefined);

  return result;
};

export const worldRuleService = {
  create: async (payload: unknown, dbName: unknown): Promise<WorldRuleNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateRulePayload(payload);
    const node = buildRuleNode(validated);
    return createRule(node, database);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<WorldRuleNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateRulePayload(payload);
    const now = new Date().toISOString();
    const node: WorldRuleNode = {
      ...validated,
      id,
      status: validated.status ?? "draft",
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateRule(node, database);
    if (!updated) {
      throw new AppError("world rule not found", 404);
    }
    return updated;
  },
  getAll: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: WorldRuleNode[]; meta: WorldRuleListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseRuleListQuery(query);
    const [data, total] = await Promise.all([
      getRules(database, parsedQuery),
      getRuleCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteRule(database, id);
    if (!deleted) {
      throw new AppError("world rule not found", 404);
    }
  },
};
