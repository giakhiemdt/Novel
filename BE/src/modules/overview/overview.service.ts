import { AppError } from "../../shared/errors/app-error";
import { createOverview, getOverview, updateOverview } from "./overview.repo";
import { OverviewInput, OverviewNode } from "./overview.types";

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

const validateOverviewPayload = (payload: unknown): OverviewInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    title: assertRequiredString(data.title, "title"),
  };

  addIfDefined(
    result,
    "subtitle",
    assertOptionalString(data.subtitle, "subtitle")
  );
  addIfDefined(result, "genre", assertOptionalStringArray(data.genre, "genre"));
  addIfDefined(
    result,
    "shortSummary",
    assertOptionalString(data.shortSummary, "shortSummary")
  );
  addIfDefined(
    result,
    "worldOverview",
    assertOptionalString(data.worldOverview, "worldOverview")
  );
  addIfDefined(
    result,
    "technologyEra",
    assertOptionalString(data.technologyEra, "technologyEra")
  );

  return result as OverviewInput;
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

const buildOverviewNode = (
  payload: OverviewInput,
  createdAt?: string
): OverviewNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    createdAt: createdAt ?? now,
    updatedAt: now,
  };
};

export const overviewService = {
  create: async (
    payload: unknown,
    dbName: unknown
  ): Promise<OverviewNode> => {
    const database = assertDatabaseName(dbName);
    const existing = await getOverview(database);
    if (existing) {
      throw new AppError("overview already exists", 400);
    }
    const validated = validateOverviewPayload(payload);
    const node = buildOverviewNode(validated);
    return createOverview(node, database);
  },
  get: async (dbName: unknown): Promise<OverviewNode | null> => {
    const database = assertDatabaseName(dbName);
    return getOverview(database);
  },
  update: async (
    payload: unknown,
    dbName: unknown
  ): Promise<OverviewNode> => {
    const database = assertDatabaseName(dbName);
    const existing = await getOverview(database);
    if (!existing) {
      throw new AppError("overview not found", 404);
    }
    const validated = validateOverviewPayload(payload);
    const node = buildOverviewNode(validated, existing.createdAt);
    return updateOverview(node, database);
  },
};
