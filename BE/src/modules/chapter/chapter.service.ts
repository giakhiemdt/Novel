import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createChapter,
  createChapterWithArc,
  deleteChapter,
  getChapterCount,
  getChapters,
  updateChapter,
  updateChapterWithArc,
} from "./chapter.repo";
import { ChapterInput, ChapterListQuery, ChapterNode } from "./chapter.types";

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

const validateChapterPayload = (payload: unknown): ChapterInput => {
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
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));
  addIfDefined(result, "arcId", assertOptionalString(data.arcId, "arcId"));

  return result as ChapterInput;
};

const buildChapterNode = (payload: ChapterInput): ChapterNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

const parseChapterListQuery = (query: unknown): ChapterListQuery => {
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

  const result: ChapterListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "arcId", parseOptionalQueryString(data.arcId, "arcId"));

  return result;
};

export const chapterService = {
  create: async (payload: unknown, dbName: unknown): Promise<ChapterNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateChapterPayload(payload);
    const node = buildChapterNode(validated);
    if (validated.arcId) {
      const created = await createChapterWithArc(node, database, validated.arcId);
      if (!created) {
        throw new AppError("arc not found", 404);
      }
      return { ...created, arcId: validated.arcId };
    }
    return createChapter(node, database);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<ChapterNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateChapterPayload(payload);
    const now = new Date().toISOString();
    const node: ChapterNode = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };

    if (validated.arcId) {
      const updated = await updateChapterWithArc(node, database, validated.arcId);
      if (!updated) {
        throw new AppError("chapter or arc not found", 404);
      }
      return { ...updated, arcId: validated.arcId };
    }

    const updated = await updateChapter(node, database);
    if (!updated) {
      throw new AppError("chapter not found", 404);
    }
    return updated;
  },
  getAll: async (dbName: unknown): Promise<ChapterNode[]> => {
    const database = assertDatabaseName(dbName);
    return getChapters(database, { limit: 50, offset: 0 });
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: ChapterNode[]; meta: ChapterListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseChapterListQuery(query);
    const [data, total] = await Promise.all([
      getChapters(database, parsedQuery),
      getChapterCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteChapter(database, id);
    if (!deleted) {
      throw new AppError("chapter not found", 404);
    }
  },
};
