import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createArc,
  deleteArc,
  getArcCount,
  getArcStructure,
  getArcs,
  updateArc,
} from "./arc.repo";
import {
  ArcInput,
  ArcListQuery,
  ArcNode,
  ArcStructureArc,
  ArcStructureChapter,
  ArcStructureScene,
} from "./arc.types";

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

const validateArcPayload = (payload: unknown): ArcInput => {
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

  return result as ArcInput;
};

const buildArcNode = (payload: ArcInput): ArcNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

const parseArcListQuery = (query: unknown): ArcListQuery => {
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

  const result: ArcListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));

  return result;
};

export const arcService = {
  create: async (payload: unknown, dbName: unknown): Promise<ArcNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateArcPayload(payload);
    const node = buildArcNode(validated);
    return createArc(node, database);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<ArcNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateArcPayload(payload);
    const now = new Date().toISOString();
    const node: ArcNode = {
      ...validated,
      id,
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateArc(node, database);
    if (!updated) {
      throw new AppError("arc not found", 404);
    }
    return updated;
  },
  getAll: async (dbName: unknown): Promise<ArcNode[]> => {
    const database = assertDatabaseName(dbName);
    return getArcs(database, { limit: 50, offset: 0 });
  },
  getAllWithQuery: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: ArcNode[]; meta: ArcListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseArcListQuery(query);
    const [data, total] = await Promise.all([
      getArcs(database, parsedQuery),
      getArcCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },
  getStructure: async (dbName: unknown): Promise<ArcStructureArc[]> => {
    const database = assertDatabaseName(dbName);
    const rows = await getArcStructure(database);
    const arcMap = new Map<string, ArcStructureArc>();
    const chapterMap = new Map<string, ArcStructureChapter>();

    rows.forEach((row) => {
      const arcId = row.arc.id;
      if (!arcMap.has(arcId)) {
        const arc: ArcStructureArc = {
          id: row.arc.id,
          name: row.arc.name,
          chapters: [],
        };
        addIfDefined(arc, "order", row.arc.order);
        addIfDefined(arc, "summary", row.arc.summary);
        arcMap.set(arcId, arc);
      }

      if (row.chapter) {
        const chapterId = String(row.chapter.id);
        if (!chapterMap.has(chapterId)) {
          const chapter: ArcStructureChapter = {
            id: chapterId,
            name: String(row.chapter.name ?? ""),
            scenes: [],
          };
          addIfDefined(
            chapter,
            "order",
            typeof row.chapter.order === "number" ? row.chapter.order : undefined
          );
          addIfDefined(
            chapter,
            "summary",
            typeof row.chapter.summary === "string"
              ? row.chapter.summary
              : undefined
          );
          chapterMap.set(chapterId, chapter);
          arcMap.get(arcId)?.chapters.push(chapter);
        }

        if (row.scene) {
          const scene: ArcStructureScene = {
            id: String(row.scene.id),
            name: String(row.scene.name ?? ""),
          };
          addIfDefined(
            scene,
            "order",
            typeof row.scene.order === "number" ? row.scene.order : undefined
          );
          addIfDefined(
            scene,
            "summary",
            typeof row.scene.summary === "string"
              ? row.scene.summary
              : undefined
          );
          const chapter = chapterMap.get(chapterId);
          if (chapter) {
            chapter.scenes.push(scene);
          }
        }
      }
    });

    return Array.from(arcMap.values());
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteArc(database, id);
    if (!deleted) {
      throw new AppError("arc not found", 404);
    }
  },
};
