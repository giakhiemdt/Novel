import { AppError } from "../../shared/errors/app-error";
import {
  checkCharacterExists,
  createRelation,
  deleteRelation,
  getRelations,
  updateRelation,
} from "./relationship.repo";
import {
  CharacterRelationInput,
  CharacterRelationNode,
  CharacterRelationQuery,
} from "./relationship.types";
import {
  ensureDefaultRelationshipTypes,
  getRelationshipTypeByCode,
} from "../relationship-type/relationship-type.repo";

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

const validatePayload = (payload: unknown): CharacterRelationInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }
  const data = payload as Record<string, unknown>;
  const fromId = assertRequiredString(data.fromId, "fromId");
  const toId = assertRequiredString(data.toId, "toId");
  if (fromId === toId) {
    throw new AppError("fromId must be different from toId", 400);
  }
  const type = assertRequiredString(data.type, "type").toLowerCase();
  const startYear = assertOptionalNumber(data.startYear, "startYear");
  const endYear = assertOptionalNumber(data.endYear, "endYear");
  if (startYear !== undefined && endYear !== undefined && endYear < startYear) {
    throw new AppError("endYear must be >= startYear", 400);
  }
  const note = assertOptionalString(data.note, "note");

  const result: CharacterRelationInput = { fromId, toId, type };
  addIfDefined(result, "startYear", startYear);
  addIfDefined(result, "endYear", endYear);
  addIfDefined(result, "note", note);
  return result;
};

const assertRelationshipTypeExists = async (
  database: string,
  type: string
): Promise<void> => {
  await ensureDefaultRelationshipTypes(database);
  const relationshipType = await getRelationshipTypeByCode(database, type);
  if (!relationshipType || !relationshipType.isActive) {
    throw new AppError("relationship type not found", 404);
  }
};

export const relationshipService = {
  create: async (
    payload: unknown,
    dbName: unknown
  ): Promise<CharacterRelationNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validatePayload(payload);

    await assertRelationshipTypeExists(database, validated.type);

    const [fromExists, toExists] = await Promise.all([
      checkCharacterExists(database, validated.fromId),
      checkCharacterExists(database, validated.toId),
    ]);
    if (!fromExists || !toExists) {
      throw new AppError("character not found", 404);
    }
    const now = new Date().toISOString();
    const node: CharacterRelationNode = {
      ...validated,
      createdAt: now,
      updatedAt: now,
    };
    return createRelation(database, node);
  },
  update: async (payload: unknown, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const validated = validatePayload(payload);

    await assertRelationshipTypeExists(database, validated.type);

    const now = new Date().toISOString();
    const node: CharacterRelationNode = {
      ...validated,
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateRelation(database, node);
    if (!updated) {
      throw new AppError("relation not found", 404);
    }
  },
  delete: async (payload: unknown, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const validated = validatePayload(payload);
    const deleted = await deleteRelation(
      database,
      validated.fromId,
      validated.toId,
      validated.type
    );
    if (!deleted) {
      throw new AppError("relation not found", 404);
    }
  },
  getAll: async (
    query: unknown,
    dbName: unknown
  ): Promise<
    {
      from: { id: string; name: string };
      to: { id: string; name: string };
      relation: {
        type: string;
        startYear?: number | null;
        endYear?: number | null;
        note?: string | null;
        createdAt?: string | null;
        updatedAt?: string | null;
      };
    }[]
  > => {
    const database = assertDatabaseName(dbName);
    const q = query as Record<string, unknown> | undefined;
    const characterId =
      q?.characterId && typeof q.characterId === "string" ? q.characterId : undefined;
    const type = q?.type && typeof q.type === "string" ? q.type.toLowerCase() : undefined;

    if (type) {
      await assertRelationshipTypeExists(database, type);
    } else {
      await ensureDefaultRelationshipTypes(database);
    }

    const filter: CharacterRelationQuery = {};
    addIfDefined(filter, "characterId", characterId);
    addIfDefined(filter, "type", type);
    return getRelations(database, filter);
  },
};
