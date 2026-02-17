import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  assertOptionalTraitArray,
  normalizeTraitArray,
  serializeTraitArray,
} from "../../shared/utils/trait";
import {
  createCharacter,
  deleteCharacter,
  getCharacters,
  getCharacterCount,
  linkCharacterRank,
  linkCharacterRace,
  linkCharacterSpecialAbility,
  unlinkCharacterRank,
  unlinkCharacterRace,
  unlinkCharacterSpecialAbility,
  updateCharacter,
} from "./character.repo";
import { getRaceByName } from "../race/race.repo";
import { getRankByName } from "../rank/rank.repo";
import { getSpecialAbilityByName } from "../special-ability/special-ability.repo";
import {
  CharacterInput,
  CharacterGender,
  CharacterImportance,
  CharacterListQuery,
  CharacterNode,
  CharacterStatus,
} from "./character.types";

const STATUSES: CharacterStatus[] = ["Alive", "Dead"];
const IMPORTANCE_LEVELS: CharacterImportance[] = [
  "Protagonist",
  "Major",
  "Supporting",
  "Minor",
  "Cameo",
];
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

const assertOptionalTrimmedString = (
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

const assertOptionalObject = (
  value: unknown,
  field: string
): Record<string, unknown> | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError(`${field} must be an object`, 400);
  }
  return value as Record<string, unknown>;
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
  const importance =
    payload.importance ?? (payload.isMainCharacter ? "Protagonist" : "Supporting");
  const isMainCharacter = payload.isMainCharacter ?? importance === "Protagonist";
  return {
    ...payload,
    id: payload.id ?? generateId(),
    status: payload.status ?? "Alive",
    importance,
    isMainCharacter,
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

const serializeExtra = (extra?: Record<string, unknown>): string | undefined => {
  if (!extra || Object.keys(extra).length === 0) {
    return undefined;
  }
  return JSON.stringify(extra);
};

const normalizeCharacterTraitFields = (node: CharacterNode): CharacterNode => {
  const normalizedDistinctiveTraits = normalizeTraitArray(
    (node as { distinctiveTraits?: unknown }).distinctiveTraits
  );
  const normalizedPersonalityTraits = normalizeTraitArray(
    (node as { personalityTraits?: unknown }).personalityTraits
  );

  const {
    distinctiveTraits: _distinctiveTraits,
    personalityTraits: _personalityTraits,
    ...rest
  } = node as CharacterNode & {
    distinctiveTraits?: unknown;
    personalityTraits?: unknown;
  };

  return {
    ...(rest as CharacterNode),
    ...(normalizedDistinctiveTraits !== undefined
      ? { distinctiveTraits: normalizedDistinctiveTraits }
      : {}),
    ...(normalizedPersonalityTraits !== undefined
      ? { personalityTraits: normalizedPersonalityTraits }
      : {}),
  };
};

const serializeCharacterTraitFields = (node: CharacterNode): CharacterNode => {
  const serializedDistinctiveTraits = serializeTraitArray(
    (node as { distinctiveTraits?: unknown }).distinctiveTraits
  );
  const serializedPersonalityTraits = serializeTraitArray(
    (node as { personalityTraits?: unknown }).personalityTraits
  );

  const {
    distinctiveTraits: _distinctiveTraits,
    personalityTraits: _personalityTraits,
    ...rest
  } = node as CharacterNode & {
    distinctiveTraits?: unknown;
    personalityTraits?: unknown;
  };

  return {
    ...(rest as CharacterNode),
    ...(serializedDistinctiveTraits !== undefined
      ? { distinctiveTraits: serializedDistinctiveTraits }
      : {}),
    ...(serializedPersonalityTraits !== undefined
      ? { personalityTraits: serializedPersonalityTraits }
      : {}),
  };
};

const parseExtra = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "string") {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return parsed;
  } catch {
    return undefined;
  }
};

const withParsedExtra = (node: CharacterNode): CharacterNode => {
  const withTraits = normalizeCharacterTraitFields(node);
  const parsed = parseExtra(withTraits.extra as unknown);
  const withExtra = parsed ? { ...withTraits, extra: parsed } : withTraits;
  const importance =
    withExtra.importance ??
    (withExtra.isMainCharacter ? "Protagonist" : "Supporting");
  const isMainCharacter =
    typeof withExtra.isMainCharacter === "boolean"
      ? withExtra.isMainCharacter
      : importance === "Protagonist";
  return { ...withExtra, importance, isMainCharacter };
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
  const specialAbility = parseOptionalQueryString(
    data.specialAbility,
    "specialAbility"
  );
  const gender = parseOptionalQueryString(data.gender, "gender");
  const status = parseOptionalQueryString(data.status, "status");
  const level = parseOptionalQueryString(data.level, "level");
  const importance = parseOptionalQueryString(data.importance, "importance");

  if (gender && !["male", "female", "other"].includes(gender)) {
    throw new AppError("gender must be one of male, female, other", 400);
  }
  if (status && !STATUSES.includes(status as CharacterStatus)) {
    throw new AppError(`status must be one of ${STATUSES.join(", ")}`, 400);
  }
  if (importance && !IMPORTANCE_LEVELS.includes(importance as CharacterImportance)) {
    throw new AppError(
      `importance must be one of ${IMPORTANCE_LEVELS.join(", ")}`,
      400
    );
  }

  const result: CharacterListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "race", race);
  addIfDefined(result, "specialAbility", specialAbility);
  addIfDefined(result, "gender", gender as CharacterGender | undefined);
  addIfDefined(result, "status", status as CharacterStatus | undefined);
  addIfDefined(result, "level", level);
  addIfDefined(result, "importance", importance as CharacterImportance | undefined);
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
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "alias", assertOptionalStringArray(data.alias, "alias"));
  addIfDefined(
    result,
    "specialAbilities",
    assertOptionalStringArray(data.specialAbilities, "specialAbilities")
  );
  addIfDefined(result, "level", assertOptionalTrimmedString(data.level, "level"));
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, STATUSES, "status")
  );
  addIfDefined(
    result,
    "importance",
    assertOptionalEnum(data.importance, IMPORTANCE_LEVELS, "importance")
  );
  addIfDefined(
    result,
    "isMainCharacter",
    assertOptionalBoolean(data.isMainCharacter, "isMainCharacter")
  );
  addIfDefined(result, "age", assertOptionalNumber(data.age, "age"));
  addIfDefined(
    result,
    "appearance",
    assertOptionalString(data.appearance, "appearance")
  );
  addIfDefined(result, "height", assertOptionalNumber(data.height, "height"));
  addIfDefined(result, "race", assertOptionalTrimmedString(data.race, "race"));
  addIfDefined(
    result,
    "distinctiveTraits",
    assertOptionalTraitArray(data.distinctiveTraits, "distinctiveTraits")
  );
  addIfDefined(
    result,
    "personalityTraits",
    assertOptionalTraitArray(data.personalityTraits, "personalityTraits")
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
  addIfDefined(result, "extra", assertOptionalObject(data.extra, "extra"));

  return result as CharacterInput;
};

export const characterService = {
  create: async (payload: unknown, dbName: unknown): Promise<CharacterNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateCharacterPayload(payload);
    const raceName = validated.race;
    if (raceName) {
      const raceExists = await getRaceByName(database, raceName);
      if (!raceExists) {
        throw new AppError("race not found", 400);
      }
    }
    const rankName = validated.level;
    if (rankName) {
      const rankExists = await getRankByName(database, rankName);
      if (!rankExists) {
        throw new AppError("rank not found", 400);
      }
    }
    const abilityNames = validated.specialAbilities ?? [];
    for (const abilityName of abilityNames) {
      const abilityExists = await getSpecialAbilityByName(database, abilityName);
      if (!abilityExists) {
        throw new AppError("special ability not found", 400);
      }
    }
    const node = buildCharacterNode({
      ...validated,
      extra: serializeExtra(validated.extra) as unknown as Record<string, unknown>,
    });
    const created = await createCharacter(
      serializeCharacterTraitFields(node),
      database
    );
    if (raceName) {
      await linkCharacterRace(database, created.id, raceName);
    }
    if (rankName) {
      await linkCharacterRank(database, created.id, rankName);
    }
    for (const abilityName of abilityNames) {
      await linkCharacterSpecialAbility(database, created.id, abilityName);
    }
    return withParsedExtra(created);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<CharacterNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateCharacterPayload(payload);
    const raceName = validated.race;
    if (raceName) {
      const raceExists = await getRaceByName(database, raceName);
      if (!raceExists) {
        throw new AppError("race not found", 400);
      }
    }
    const rankName = validated.level;
    if (rankName) {
      const rankExists = await getRankByName(database, rankName);
      if (!rankExists) {
        throw new AppError("rank not found", 400);
      }
    }
    const abilityNames = validated.specialAbilities ?? [];
    for (const abilityName of abilityNames) {
      const abilityExists = await getSpecialAbilityByName(database, abilityName);
      if (!abilityExists) {
        throw new AppError("special ability not found", 400);
      }
    }
    const now = new Date().toISOString();
    const importance =
      validated.importance ??
      (validated.isMainCharacter ? "Protagonist" : "Supporting");
    const isMainCharacter =
      validated.isMainCharacter ?? importance === "Protagonist";
    const node: CharacterNode = {
      ...validated,
      id,
      status: validated.status ?? "Alive",
      importance,
      isMainCharacter,
      createdAt: now,
      updatedAt: now,
      extra: serializeExtra(validated.extra) as unknown as Record<string, unknown>,
    };
    const updated = await updateCharacter(
      serializeCharacterTraitFields(node),
      database
    );
    if (!updated) {
      throw new AppError("character not found", 404);
    }
    await unlinkCharacterRace(database, id);
    await unlinkCharacterRank(database, id);
    await unlinkCharacterSpecialAbility(database, id);
    if (raceName) {
      await linkCharacterRace(database, id, raceName);
    }
    if (rankName) {
      await linkCharacterRank(database, id, rankName);
    }
    for (const abilityName of abilityNames) {
      await linkCharacterSpecialAbility(database, id, abilityName);
    }
    return withParsedExtra(updated);
  },
  getAll: async (dbName: unknown): Promise<CharacterNode[]> => {
    const database = assertDatabaseName(dbName);
    const data = await getCharacters(database, { limit: 50, offset: 0 });
    return data.map(withParsedExtra);
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: CharacterNode[]; meta: CharacterListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseCharacterListQuery(query);
    const [data, total] = await Promise.all([
      getCharacters(database, parsedQuery),
      getCharacterCount(database, parsedQuery),
    ]);
    return {
      data: data.map(withParsedExtra),
      meta: { ...parsedQuery, total },
    };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteCharacter(database, id);
    if (!deleted) {
      throw new AppError("character not found", 404);
    }
  },
};
