import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createCharacter,
  deleteCharacter,
  getCharacters,
  linkCharacterRace,
  unlinkCharacterRace,
  updateCharacter,
} from "./character.repo";
import { getRaceByName } from "../race/race.repo";
import {
  CharacterInput,
  CharacterLevel,
  CharacterGender,
  CharacterListQuery,
  CharacterNode,
  CharacterStatus,
} from "./character.types";

const LEVELS: CharacterLevel[] = ["T1", "T2", "T3", "T4", "T5", "T6", "T7"];
const STATUSES: CharacterStatus[] = ["Alive", "Dead"];
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

const parseCharacterListQuery = (query: unknown): CharacterListQuery => {
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

  const race = parseOptionalQueryString(data.race, "race");
  const gender = parseOptionalQueryString(data.gender, "gender");
  const status = parseOptionalQueryString(data.status, "status");
  const level = parseOptionalQueryString(data.level, "level");

  if (gender && !["male", "female", "other"].includes(gender)) {
    throw new AppError("gender must be one of male, female, other", 400);
  }
  if (status && !STATUSES.includes(status as CharacterStatus)) {
    throw new AppError(`status must be one of ${STATUSES.join(", ")}`, 400);
  }
  if (level && !LEVELS.includes(level as CharacterLevel)) {
    throw new AppError(`level must be one of ${LEVELS.join(", ")}`, 400);
  }

  const result: CharacterListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "race", race);
  addIfDefined(result, "gender", gender as CharacterGender | undefined);
  addIfDefined(result, "status", status as CharacterStatus | undefined);
  addIfDefined(result, "level", level as CharacterLevel | undefined);
  addIfDefined(
    result,
    "isMainCharacter",
    parseOptionalQueryBoolean(data.isMainCharacter, "isMainCharacter")
  );

  return result;
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
    race: assertRequiredString(data.race, "race"),
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
  create: async (payload: unknown, dbName: unknown): Promise<CharacterNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateCharacterPayload(payload);
    const raceExists = await getRaceByName(database, validated.race);
    if (!raceExists) {
      throw new AppError("race not found", 400);
    }
    const node = buildCharacterNode(validated);
    const created = await createCharacter(node, database);
    await linkCharacterRace(database, created.id, validated.race);
    return created;
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<CharacterNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateCharacterPayload(payload);
    const raceExists = await getRaceByName(database, validated.race);
    if (!raceExists) {
      throw new AppError("race not found", 400);
    }
    const now = new Date().toISOString();
    const node: CharacterNode = {
      ...validated,
      id,
      status: validated.status ?? "Alive",
      isMainCharacter: validated.isMainCharacter ?? false,
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateCharacter(node, database);
    if (!updated) {
      throw new AppError("character not found", 404);
    }
    await unlinkCharacterRace(database, id);
    await linkCharacterRace(database, id, validated.race);
    return updated;
  },
  getAll: async (dbName: unknown): Promise<CharacterNode[]> => {
    const database = assertDatabaseName(dbName);
    return getCharacters(database, { limit: 50, offset: 0 });
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: CharacterNode[]; meta: CharacterListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseCharacterListQuery(query);
    const data = await getCharacters(database, parsedQuery);
    return { data, meta: parsedQuery };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteCharacter(database, id);
    if (!deleted) {
      throw new AppError("character not found", 404);
    }
  },
};
