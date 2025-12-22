import { AppError } from "../../shared/errors/app-error";
import { createFaction } from "./faction.repo";
import { FactionInput, FactionNode } from "./faction.types";

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

const validateFactionPayload = (payload: unknown): FactionInput => {
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
    createdAt: now,
    updatedAt: now,
  };
};

export const factionService = {
  create: async (payload: unknown): Promise<FactionNode> => {
    const validated = validateFactionPayload(payload);
    const node = buildFactionNode(validated);
    return createFaction(node);
  },
};
