import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  checkChapterExists,
  checkEventExists,
  checkLocationExists,
  createScene,
  deleteScene,
  getCharacterIds,
  getScenes,
  linkSceneChapter,
  linkSceneEvent,
  linkSceneLocation,
  unlinkSceneChapter,
  unlinkSceneEvent,
  unlinkSceneLocation,
  updateScene,
  updateSceneCharacters,
} from "./scene.repo";
import { SceneInput, SceneListQuery, SceneNode } from "./scene.types";

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

const validateScenePayload = (payload: unknown): SceneInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "order", assertOptionalNumber(data.order, "order"));
  addIfDefined(
    result,
    "summary",
    assertOptionalString(data.summary, "summary")
  );
  addIfDefined(
    result,
    "content",
    assertOptionalString(data.content, "content")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));
  addIfDefined(
    result,
    "chapterId",
    assertOptionalString(data.chapterId, "chapterId")
  );
  addIfDefined(
    result,
    "eventId",
    assertOptionalString(data.eventId, "eventId")
  );
  addIfDefined(
    result,
    "locationId",
    assertOptionalString(data.locationId, "locationId")
  );
  addIfDefined(
    result,
    "characterIds",
    assertOptionalStringArray(data.characterIds, "characterIds")
  );

  return result as SceneInput;
};

const buildSceneNode = (payload: SceneInput): SceneNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

const parseSceneListQuery = (query: unknown): SceneListQuery => {
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

  const result: SceneListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(
    result,
    "chapterId",
    parseOptionalQueryString(data.chapterId, "chapterId")
  );
  addIfDefined(
    result,
    "eventId",
    parseOptionalQueryString(data.eventId, "eventId")
  );
  addIfDefined(
    result,
    "locationId",
    parseOptionalQueryString(data.locationId, "locationId")
  );
  addIfDefined(
    result,
    "characterId",
    parseOptionalQueryString(data.characterId, "characterId")
  );

  return result;
};
const assertCharacterIds = async (
  database: string,
  characterIds: string[]
): Promise<void> => {
  const unique = new Set(characterIds);
  if (unique.size !== characterIds.length) {
    throw new AppError("characterIds must be unique", 400);
  }
  const found = await getCharacterIds(database, characterIds);
  if (found.length !== characterIds.length) {
    throw new AppError("character not found", 404);
  }
};

export const sceneService = {
  create: async (payload: unknown, dbName: unknown): Promise<SceneNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateScenePayload(payload);
    const node = buildSceneNode(validated);

    if (validated.chapterId) {
      const exists = await checkChapterExists(database, validated.chapterId);
      if (!exists) {
        throw new AppError("chapter not found", 404);
      }
    }
    if (validated.eventId) {
      const exists = await checkEventExists(database, validated.eventId);
      if (!exists) {
        throw new AppError("event not found", 404);
      }
    }
    if (validated.locationId) {
      const exists = await checkLocationExists(database, validated.locationId);
      if (!exists) {
        throw new AppError("location not found", 404);
      }
    }
    if (validated.characterIds) {
      await assertCharacterIds(database, validated.characterIds);
    }

    const created = await createScene(node, database);

    if (validated.chapterId) {
      await linkSceneChapter(database, created.id, validated.chapterId);
    }
    if (validated.eventId) {
      await linkSceneEvent(database, created.id, validated.eventId);
    }
    if (validated.locationId) {
      await linkSceneLocation(database, created.id, validated.locationId);
    }
    if (validated.characterIds) {
      await updateSceneCharacters(database, created.id, validated.characterIds);
    }

    const result: SceneNode = { ...created };
    addIfDefined(result, "chapterId", validated.chapterId);
    addIfDefined(result, "eventId", validated.eventId);
    addIfDefined(result, "locationId", validated.locationId);
    addIfDefined(result, "characterIds", validated.characterIds ?? []);
    return result;
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<SceneNode> => {
    const database = assertDatabaseName(dbName);
    if (!payload || typeof payload !== "object") {
      throw new AppError("payload must be an object", 400);
    }
    const raw = payload as Record<string, unknown>;
    const hasChapterId = Object.prototype.hasOwnProperty.call(raw, "chapterId");
    const hasEventId = Object.prototype.hasOwnProperty.call(raw, "eventId");
    const hasLocationId = Object.prototype.hasOwnProperty.call(raw, "locationId");
    const hasCharacterIds = Object.prototype.hasOwnProperty.call(
      raw,
      "characterIds"
    );

    const validated = validateScenePayload(payload);
    const now = new Date().toISOString();
    const node: SceneNode = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (hasChapterId && validated.chapterId) {
      const exists = await checkChapterExists(database, validated.chapterId);
      if (!exists) {
        throw new AppError("chapter not found", 404);
      }
    }
    if (hasEventId && validated.eventId) {
      const exists = await checkEventExists(database, validated.eventId);
      if (!exists) {
        throw new AppError("event not found", 404);
      }
    }
    if (hasLocationId && validated.locationId) {
      const exists = await checkLocationExists(database, validated.locationId);
      if (!exists) {
        throw new AppError("location not found", 404);
      }
    }
    if (hasCharacterIds && validated.characterIds) {
      await assertCharacterIds(database, validated.characterIds);
    }

    const updated = await updateScene(node, database);
    if (!updated) {
      throw new AppError("scene not found", 404);
    }

    if (hasChapterId) {
      if (validated.chapterId) {
        await linkSceneChapter(database, updated.id, validated.chapterId);
      } else {
        await unlinkSceneChapter(database, updated.id);
      }
    }
    if (hasEventId) {
      if (validated.eventId) {
        await linkSceneEvent(database, updated.id, validated.eventId);
      } else {
        await unlinkSceneEvent(database, updated.id);
      }
    }
    if (hasLocationId) {
      if (validated.locationId) {
        await linkSceneLocation(database, updated.id, validated.locationId);
      } else {
        await unlinkSceneLocation(database, updated.id);
      }
    }
    if (hasCharacterIds) {
      await updateSceneCharacters(
        database,
        updated.id,
        validated.characterIds ?? []
      );
    }

    const result: SceneNode = { ...updated };
    if (hasChapterId) {
      addIfDefined(result, "chapterId", validated.chapterId);
    }
    if (hasEventId) {
      addIfDefined(result, "eventId", validated.eventId);
    }
    if (hasLocationId) {
      addIfDefined(result, "locationId", validated.locationId);
    }
    if (hasCharacterIds) {
      addIfDefined(result, "characterIds", validated.characterIds ?? []);
    }
    return result;
  },
  getAll: async (dbName: unknown): Promise<SceneNode[]> => {
    const database = assertDatabaseName(dbName);
    return getScenes(database, { limit: 50, offset: 0 });
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: SceneNode[]; meta: SceneListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseSceneListQuery(query);
    const data = await getScenes(database, parsedQuery);
    return { data, meta: parsedQuery };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteScene(database, id);
    if (!deleted) {
      throw new AppError("scene not found", 404);
    }
  },
};
