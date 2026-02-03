import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createChapter,
  createChapterWithArc,
  deleteChapter,
  getChapters,
  updateChapter,
  updateChapterWithArc,
} from "./chapter.repo";
import { ChapterInput, ChapterNode } from "./chapter.types";

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
    return getChapters(database);
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteChapter(database, id);
    if (!deleted) {
      throw new AppError("chapter not found", 404);
    }
  },
};
