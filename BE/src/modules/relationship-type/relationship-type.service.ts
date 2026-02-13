import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  countCharacterRelationsByType,
  createRelationshipType,
  deleteCharacterRelationsByType,
  deleteRelationshipType,
  ensureDefaultRelationshipTypes,
  getRelationshipTypeByCode,
  getRelationshipTypeById,
  getRelationshipTypes,
  updateRelationshipType,
} from "./relationship-type.repo";
import {
  RelationshipTypeInput,
  RelationshipTypeListQuery,
  RelationshipTypeNode,
} from "./relationship-type.types";

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
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  throw new AppError(`${field} must be a boolean`, 400);
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

const normalizeCode = (value: string): string => value.trim().toLowerCase();

const addIfDefined = (
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void => {
  if (value !== undefined) {
    target[key] = value;
  }
};

const validatePayload = (payload: unknown): RelationshipTypeInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const code = normalizeCode(assertRequiredString(data.code, "code"));
  const name = assertRequiredString(data.name, "name");

  const result: Record<string, unknown> = {
    code,
    name,
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(
    result,
    "isDirectional",
    assertOptionalBoolean(data.isDirectional, "isDirectional")
  );
  addIfDefined(result, "color", assertOptionalString(data.color, "color"));
  addIfDefined(
    result,
    "isSystem",
    assertOptionalBoolean(data.isSystem, "isSystem")
  );
  addIfDefined(
    result,
    "isActive",
    assertOptionalBoolean(data.isActive, "isActive")
  );

  return result as RelationshipTypeInput;
};

const parseListQuery = (query: unknown): RelationshipTypeListQuery => {
  if (!query || typeof query !== "object") {
    return { activeOnly: true };
  }

  const data = query as Record<string, unknown>;
  return {
    activeOnly: parseOptionalQueryBoolean(data.activeOnly, "activeOnly") ?? true,
  };
};

const buildNode = (payload: RelationshipTypeInput): RelationshipTypeNode => {
  const now = new Date().toISOString();
  const node: RelationshipTypeNode = {
    id: payload.id ?? generateId(),
    code: normalizeCode(payload.code),
    name: payload.name,
    isDirectional: payload.isDirectional ?? false,
    isSystem: payload.isSystem ?? false,
    isActive: payload.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  if (payload.description !== undefined) {
    node.description = payload.description;
  }
  if (payload.color !== undefined) {
    node.color = payload.color;
  }
  return node;
};

const assertCodeAvailable = async (
  database: string,
  code: string,
  excludedId?: string
): Promise<void> => {
  const existing = await getRelationshipTypeByCode(database, code);
  if (existing && existing.id !== excludedId) {
    throw new AppError("relationship type code already exists", 409);
  }
};

export const relationshipTypeService = {
  create: async (
    payload: unknown,
    dbName: unknown
  ): Promise<RelationshipTypeNode> => {
    const database = assertDatabaseName(dbName);
    await ensureDefaultRelationshipTypes(database);

    const validated = validatePayload(payload);
    const node = buildNode(validated);
    await assertCodeAvailable(database, node.code);
    return createRelationshipType(database, node);
  },

  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<RelationshipTypeNode> => {
    const database = assertDatabaseName(dbName);
    await ensureDefaultRelationshipTypes(database);

    const existing = await getRelationshipTypeById(database, id);
    if (!existing) {
      throw new AppError("relationship type not found", 404);
    }

    const validated = validatePayload(payload);
    await assertCodeAvailable(database, validated.code, id);

    const updatedAt = new Date().toISOString();
    const node: RelationshipTypeNode = {
      ...existing,
      ...validated,
      id,
      code: normalizeCode(validated.code),
      isSystem: existing.isSystem,
      isDirectional: validated.isDirectional ?? existing.isDirectional,
      isActive: validated.isActive ?? existing.isActive,
      updatedAt,
    };

    const updated = await updateRelationshipType(database, node);
    if (!updated) {
      throw new AppError("relationship type not found", 404);
    }
    return updated;
  },

  getAll: async (
    dbName: unknown,
    query: unknown
  ): Promise<RelationshipTypeNode[]> => {
    const database = assertDatabaseName(dbName);
    await ensureDefaultRelationshipTypes(database);
    const parsed = parseListQuery(query);
    return getRelationshipTypes(database, parsed.activeOnly ?? true);
  },

  delete: async (
    id: string,
    dbName: unknown,
    query: unknown
  ): Promise<void> => {
    const database = assertDatabaseName(dbName);
    await ensureDefaultRelationshipTypes(database);
    const q = (query ?? {}) as Record<string, unknown>;
    const force = parseOptionalQueryBoolean(q.force, "force") ?? false;

    const existing = await getRelationshipTypeById(database, id);
    if (!existing) {
      throw new AppError("relationship type not found", 404);
    }

    if (existing.isSystem) {
      throw new AppError("system relationship type cannot be deleted", 400);
    }

    const usage = await countCharacterRelationsByType(database, existing.code);
    if (usage > 0) {
      if (!force) {
        throw new AppError(
          "relationship type is in use; retry with force=true to delete linked relations",
          409
        );
      }
      await deleteCharacterRelationsByType(database, existing.code);
    }

    const deleted = await deleteRelationshipType(database, id);
    if (!deleted) {
      throw new AppError("relationship type not found", 404);
    }
  },
};
