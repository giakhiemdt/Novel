import { AppError } from "../../shared/errors/app-error";
import { createLocation } from "./location.repo";
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
    id: assertRequiredString(data.id, "id"),
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "alias", assertOptionalStringArray(data.alias, "alias"));
  addIfDefined(result, "type", assertOptionalString(data.type, "type"));
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
    createdAt: now,
    updatedAt: now,
  };
};

export const locationService = {
  create: async (payload: unknown): Promise<LocationNode> => {
    const validated = validateLocationPayload(payload);
    const node = buildLocationNode(validated);
    return createLocation(node);
  },
};
