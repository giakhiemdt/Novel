import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  assertOptionalTraitArray,
  normalizeTraitArray,
  serializeTraitArray,
} from "../../shared/utils/trait";
import {
  checkEventExists,
  checkItemExists,
  checkOwnerExists,
  createItem,
  deleteItem,
  getItemCount,
  getEventsByItem,
  getItems,
  getItemsByEvent,
  linkItemEvent,
  linkOwner,
  unlinkItemEvent,
  unlinkOwners,
  updateItem,
} from "./item.repo";
import {
  ITEM_OWNER_TYPES,
  ITEM_STATUSES,
  ITEM_TYPES,
  ItemInput,
  ItemListQuery,
  ItemNode,
  ItemOwnerType,
  ItemStatus,
  ItemType,
} from "./item.types";

const STATUSES: ItemStatus[] = [...ITEM_STATUSES];
const OWNER_TYPES: ItemOwnerType[] = [...ITEM_OWNER_TYPES];
const TYPES: ItemType[] = [...ITEM_TYPES];

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

const addIfDefined = (
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void => {
  if (value !== undefined) {
    target[key] = value;
  }
};

const validateItemPayload = (payload: unknown): ItemInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "origin", assertOptionalString(data.origin, "origin"));
  addIfDefined(result, "ownerId", assertOptionalString(data.ownerId, "ownerId"));
  addIfDefined(
    result,
    "ownerType",
    assertOptionalEnum(data.ownerType, OWNER_TYPES, "ownerType")
  );
  addIfDefined(result, "type", assertOptionalEnum(data.type, TYPES, "type"));
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, STATUSES, "status")
  );
  addIfDefined(
    result,
    "powerLevel",
    assertOptionalNumber(data.powerLevel, "powerLevel")
  );
  addIfDefined(
    result,
    "powerDescription",
    assertOptionalString(data.powerDescription, "powerDescription")
  );
  addIfDefined(
    result,
    "abilities",
    assertOptionalTraitArray(data.abilities, "abilities")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as ItemInput;
};

const buildItemNode = (payload: ItemInput): ItemNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    status: payload.status ?? "owned",
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeItemForPersistence = (node: ItemNode): ItemNode => {
  const serializedAbilities = serializeTraitArray(
    (node as { abilities?: unknown }).abilities
  );
  const { abilities: _abilities, ...rest } = node as ItemNode & {
    abilities?: unknown;
  };
  if (serializedAbilities === undefined) {
    return rest as ItemNode;
  }
  return {
    ...(rest as ItemNode),
    abilities: serializedAbilities,
  };
};

const normalizeItemNode = (node: ItemNode): ItemNode => {
  const normalizedAbilities = normalizeTraitArray(
    (node as { abilities?: unknown }).abilities
  );
  const { abilities: _abilities, ...rest } = node as ItemNode & {
    abilities?: unknown;
  };
  if (normalizedAbilities === undefined) {
    return rest as ItemNode;
  }
  return {
    ...(rest as ItemNode),
    abilities: normalizedAbilities,
  };
};

const parseItemListQuery = (query: unknown): ItemListQuery => {
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

  const status = parseOptionalQueryString(data.status, "status");
  const ownerType = parseOptionalQueryString(data.ownerType, "ownerType");
  const type = parseOptionalQueryString(data.type, "type");

  if (status && !STATUSES.includes(status as ItemStatus)) {
    throw new AppError(`status must be one of ${STATUSES.join(", ")}`, 400);
  }
  if (ownerType && !OWNER_TYPES.includes(ownerType as ItemOwnerType)) {
    throw new AppError(
      `ownerType must be one of ${OWNER_TYPES.join(", ")}`,
      400
    );
  }
  if (type && !TYPES.includes(type as ItemType)) {
    throw new AppError(`type must be one of ${TYPES.join(", ")}`, 400);
  }

  const result: ItemListQuery = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "type", type as ItemType | undefined);
  addIfDefined(result, "status", status as ItemStatus | undefined);
  addIfDefined(result, "ownerId", parseOptionalQueryString(data.ownerId, "ownerId"));
  addIfDefined(result, "ownerType", ownerType as ItemOwnerType | undefined);

  return result;
};

const parseEventListQuery = (query: unknown): {
  q?: string;
  name?: string;
  tag?: string;
  type?: string;
  timelineId?: string;
  locationId?: string;
  offset?: number;
  limit?: number;
} => {
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

  const result: {
    q?: string;
    name?: string;
    tag?: string;
    type?: string;
    timelineId?: string;
    locationId?: string;
    offset?: number;
    limit?: number;
  } = {
    limit: normalizedLimit,
    offset: normalizedOffset,
  };

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "tag", parseOptionalQueryString(data.tag, "tag"));
  addIfDefined(result, "type", parseOptionalQueryString(data.type, "type"));
  addIfDefined(
    result,
    "timelineId",
    parseOptionalQueryString(data.timelineId, "timelineId")
  );
  addIfDefined(
    result,
    "locationId",
    parseOptionalQueryString(data.locationId, "locationId")
  );

  return result;
};

export const itemService = {
  create: async (payload: unknown, dbName: unknown): Promise<ItemNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateItemPayload(payload);

    if ((validated.ownerId && !validated.ownerType) || (!validated.ownerId && validated.ownerType)) {
      throw new AppError("ownerId and ownerType must be provided together", 400);
    }

    if (validated.ownerId && validated.ownerType) {
      const exists = await checkOwnerExists(
        database,
        validated.ownerType,
        validated.ownerId
      );
      if (!exists) {
        throw new AppError("owner not found", 404);
      }
    }

    const node = buildItemNode(validated);
    const created = await createItem(
      normalizeItemForPersistence(node),
      database
    );

    if (validated.ownerId && validated.ownerType) {
      await linkOwner(database, created.id, validated.ownerType, validated.ownerId);
    }

    return normalizeItemNode(created);
  },
  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<ItemNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateItemPayload(payload);

    if ((validated.ownerId && !validated.ownerType) || (!validated.ownerId && validated.ownerType)) {
      throw new AppError("ownerId and ownerType must be provided together", 400);
    }

    if (validated.ownerId && validated.ownerType) {
      const exists = await checkOwnerExists(
        database,
        validated.ownerType,
        validated.ownerId
      );
      if (!exists) {
        throw new AppError("owner not found", 404);
      }
    }

    const now = new Date().toISOString();
    const node: ItemNode = {
      ...validated,
      id,
      status: validated.status ?? "owned",
      createdAt: now,
      updatedAt: now,
    };

    const updated = await updateItem(
      normalizeItemForPersistence(node),
      database
    );
    if (!updated) {
      throw new AppError("item not found", 404);
    }

    await unlinkOwners(database, id);
    if (validated.ownerId && validated.ownerType) {
      await linkOwner(database, id, validated.ownerType, validated.ownerId);
    }

    return normalizeItemNode(updated);
  },
  getAll: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: ItemNode[]; meta: ItemListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseItemListQuery(query);
    const [data, total] = await Promise.all([
      getItems(database, parsedQuery),
      getItemCount(database, parsedQuery),
    ]);
    return {
      data: data.map(normalizeItemNode),
      meta: { ...parsedQuery, total },
    };
  },
  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteItem(database, id);
    if (!deleted) {
      throw new AppError("item not found", 404);
    }
  },
  linkEvent: async (
    id: string,
    eventId: unknown,
    dbName: unknown
  ): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const parsedEventId = assertRequiredString(eventId, "eventId");
    const itemExists = await checkItemExists(database, id);
    if (!itemExists) {
      throw new AppError("item not found", 404);
    }
    const eventExists = await checkEventExists(database, parsedEventId);
    if (!eventExists) {
      throw new AppError("event not found", 404);
    }
    await linkItemEvent(database, id, parsedEventId);
  },
  unlinkEvent: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const itemExists = await checkItemExists(database, id);
    if (!itemExists) {
      throw new AppError("item not found", 404);
    }
    await unlinkItemEvent(database, id);
  },
  getItemsByEvent: async (
    eventId: string,
    query: unknown,
    dbName: unknown
  ): Promise<{ data: ItemNode[]; meta: ItemListQuery }> => {
    const database = assertDatabaseName(dbName);
    const eventExists = await checkEventExists(database, eventId);
    if (!eventExists) {
      throw new AppError("event not found", 404);
    }
    const parsedQuery = parseItemListQuery(query);
    const data = await getItemsByEvent(database, eventId, parsedQuery);
    return { data: data.map(normalizeItemNode), meta: parsedQuery };
  },
  getEventsByItem: async (
    itemId: string,
    query: unknown,
    dbName: unknown
  ): Promise<{ data: Record<string, unknown>[]; meta: Record<string, unknown> }> => {
    const database = assertDatabaseName(dbName);
    const itemExists = await checkItemExists(database, itemId);
    if (!itemExists) {
      throw new AppError("item not found", 404);
    }
    const parsedQuery = parseEventListQuery(query);
    const data = await getEventsByItem(database, itemId, parsedQuery);
    return { data, meta: parsedQuery };
  },
};
