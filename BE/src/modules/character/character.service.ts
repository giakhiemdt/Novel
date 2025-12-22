import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import { createCharacter } from "./character.repo";
import {
  CharacterInput,
  CharacterLevel,
  CharacterNode,
  CharacterRace,
  CharacterStatus,
} from "./character.types";

const LEVELS: CharacterLevel[] = ["T1", "T2", "T3", "T4", "T5", "T6", "T7"];
const STATUSES: CharacterStatus[] = ["Alive", "Dead"];
const RACES: CharacterRace[] = ["human", "elf", "demon"];

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const assertRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`${field} is required`, 400);
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

const assertRequiredEnum = <T extends string>(
  value: unknown,
  allowed: T[],
  field: string
): T => {
  const parsed = assertOptionalEnum(value, allowed, field);
  if (!parsed) {
    throw new AppError(`${field} is required`, 400);
  }
  return parsed;
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

const assertRequiredNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError(`${field} is required`, 400);
  }
  return value;
};

const assertRequiredGender = (value: unknown): CharacterInput["gender"] => {
  if (typeof value !== "string") {
    throw new AppError("gender is required", 400);
  }
  const normalized = value.toLowerCase();
  if (normalized !== "male" && normalized !== "female" && normalized !== "other") {
    throw new AppError("gender must be one of male, female, other", 400);
  }
  return normalized as CharacterInput["gender"];
};

const buildCharacterNode = (payload: CharacterInput): CharacterNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    status: payload.status ?? "Alive",
    isMainCharacter: payload.isMainCharacter ?? false,
    createdAt: now,
    updatedAt: now,
  };
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

const validateCharacterPayload = (payload: unknown): CharacterInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
    gender: assertRequiredGender(data.gender),
    age: assertRequiredNumber(data.age, "age"),
    race: assertRequiredEnum(data.race, RACES, "race"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "alias", assertOptionalStringArray(data.alias, "alias"));
  addIfDefined(
    result,
    "soulArt",
    assertOptionalStringArray(data.soulArt, "soulArt")
  );
  addIfDefined(result, "level", assertOptionalEnum(data.level, LEVELS, "level"));
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, STATUSES, "status")
  );
  addIfDefined(
    result,
    "isMainCharacter",
    assertOptionalBoolean(data.isMainCharacter, "isMainCharacter")
  );
  addIfDefined(
    result,
    "appearance",
    assertOptionalString(data.appearance, "appearance")
  );
  addIfDefined(result, "height", assertOptionalNumber(data.height, "height"));
  addIfDefined(
    result,
    "distinctiveTraits",
    assertOptionalStringArray(data.distinctiveTraits, "distinctiveTraits")
  );
  addIfDefined(
    result,
    "personalityTraits",
    assertOptionalStringArray(data.personalityTraits, "personalityTraits")
  );
  addIfDefined(
    result,
    "beliefs",
    assertOptionalStringArray(data.beliefs, "beliefs")
  );
  addIfDefined(
    result,
    "fears",
    assertOptionalStringArray(data.fears, "fears")
  );
  addIfDefined(
    result,
    "desires",
    assertOptionalStringArray(data.desires, "desires")
  );
  addIfDefined(
    result,
    "weaknesses",
    assertOptionalStringArray(data.weaknesses, "weaknesses")
  );
  addIfDefined(result, "origin", assertOptionalString(data.origin, "origin"));
  addIfDefined(
    result,
    "background",
    assertOptionalString(data.background, "background")
  );
  addIfDefined(
    result,
    "trauma",
    assertOptionalStringArray(data.trauma, "trauma")
  );
  addIfDefined(result, "secret", assertOptionalString(data.secret, "secret"));
  addIfDefined(
    result,
    "currentLocation",
    assertOptionalString(data.currentLocation, "currentLocation")
  );
  addIfDefined(
    result,
    "currentGoal",
    assertOptionalString(data.currentGoal, "currentGoal")
  );
  addIfDefined(
    result,
    "currentAffiliation",
    assertOptionalString(data.currentAffiliation, "currentAffiliation")
  );
  addIfDefined(
    result,
    "powerState",
    assertOptionalString(data.powerState, "powerState")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as CharacterInput;
};

export const characterService = {
  create: async (payload: unknown): Promise<CharacterNode> => {
    const validated = validateCharacterPayload(payload);
    const node = buildCharacterNode(validated);
    return createCharacter(node);
  },
};
