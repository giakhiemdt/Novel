import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import { getEnergyTypeById } from "../energy-type/energy-type.repo";
import {
  createEnergyTier,
  deleteEnergyTier,
  getEnergyTierByCode,
  getEnergyTierLinks,
  getEnergyTierById,
  getEnergyTiers,
  linkEnergyTiers,
  unlinkEnergyTiers,
  updateEnergyTier,
} from "./energy-tier.repo";
import {
  EnergyTierInput,
  EnergyTierLinkInput,
  EnergyTierLinkNode,
  EnergyTierListQuery,
  EnergyTierNode,
} from "./energy-tier.types";

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

const assertOptionalNumber = (
  value: unknown,
  field: string
): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError(`${field} must be a number`, 400);
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

const validatePayload = (payload: unknown): EnergyTierInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    energyTypeId: assertRequiredString(data.energyTypeId, "energyTypeId"),
    code: normalizeCode(assertRequiredString(data.code, "code")),
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "level", assertOptionalNumber(data.level, "level"));
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(result, "color", assertOptionalString(data.color, "color"));
  addIfDefined(
    result,
    "isActive",
    assertOptionalBoolean(data.isActive, "isActive")
  );

  return result as EnergyTierInput;
};

const parseListQuery = (query: unknown): EnergyTierListQuery => {
  if (!query || typeof query !== "object") {
    return { activeOnly: true };
  }

  const data = query as Record<string, unknown>;
  const result: EnergyTierListQuery = {
    activeOnly: parseOptionalQueryBoolean(data.activeOnly, "activeOnly") ?? true,
  };
  addIfDefined(
    result as unknown as Record<string, unknown>,
    "energyTypeId",
    parseOptionalQueryString(data.energyTypeId, "energyTypeId")
  );
  return result;
};

const assertRequiredId = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`${field} is required`, 400);
  }
  return value.trim();
};

const validateLinkPayload = (payload: unknown): EnergyTierLinkInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }
  const data = payload as Record<string, unknown>;
  if (data.currentId === data.previousId) {
    throw new AppError("currentId and previousId must be different", 400);
  }
  const result: EnergyTierLinkInput = {
    currentId: assertRequiredId(data.currentId, "currentId"),
    previousId: assertRequiredId(data.previousId, "previousId"),
  };
  addIfDefined(
    result as unknown as Record<string, unknown>,
    "requiredAmount",
    assertOptionalNumber(data.requiredAmount, "requiredAmount")
  );
  addIfDefined(
    result as unknown as Record<string, unknown>,
    "efficiency",
    assertOptionalNumber(data.efficiency, "efficiency")
  );
  addIfDefined(
    result as unknown as Record<string, unknown>,
    "condition",
    assertOptionalString(data.condition, "condition")
  );
  return result;
};

const buildNode = (payload: EnergyTierInput): EnergyTierNode => {
  const now = new Date().toISOString();
  const node: EnergyTierNode = {
    id: payload.id ?? generateId(),
    energyTypeId: payload.energyTypeId,
    code: normalizeCode(payload.code),
    name: payload.name,
    isActive: payload.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  if (payload.level !== undefined) {
    node.level = payload.level;
  }
  if (payload.description !== undefined) {
    node.description = payload.description;
  }
  if (payload.color !== undefined) {
    node.color = payload.color;
  }
  return node;
};

const assertEnergyTypeExists = async (
  database: string,
  energyTypeId: string
): Promise<void> => {
  const type = await getEnergyTypeById(database, energyTypeId);
  if (!type) {
    throw new AppError("energy type not found", 404);
  }
};

const assertCodeAvailable = async (
  database: string,
  code: string,
  excludedId?: string
): Promise<void> => {
  const existing = await getEnergyTierByCode(database, code);
  if (existing && existing.id !== excludedId) {
    throw new AppError("energy tier code already exists", 409);
  }
};

export const energyTierService = {
  create: async (payload: unknown, dbName: unknown): Promise<EnergyTierNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validatePayload(payload);
    await assertEnergyTypeExists(database, validated.energyTypeId);
    await assertCodeAvailable(database, validated.code);
    const node = buildNode(validated);
    const created = await createEnergyTier(database, node);
    if (!created) {
      throw new AppError("energy type not found", 404);
    }
    return created;
  },

  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<EnergyTierNode> => {
    const database = assertDatabaseName(dbName);
    const existing = await getEnergyTierById(database, id);
    if (!existing) {
      throw new AppError("energy tier not found", 404);
    }

    const validated = validatePayload(payload);
    await assertEnergyTypeExists(database, validated.energyTypeId);
    await assertCodeAvailable(database, validated.code, id);

    const updatedAt = new Date().toISOString();
    const node: EnergyTierNode = {
      ...existing,
      ...validated,
      id,
      updatedAt,
    };

    const updated = await updateEnergyTier(database, node);
    if (!updated) {
      throw new AppError("energy tier not found", 404);
    }
    return updated;
  },

  getAll: async (
    dbName: unknown,
    query: unknown
  ): Promise<EnergyTierNode[]> => {
    const database = assertDatabaseName(dbName);
    const parsed = parseListQuery(query);
    return getEnergyTiers(database, parsed.activeOnly ?? true, parsed.energyTypeId);
  },

  getLinks: async (dbName: unknown): Promise<{ data: EnergyTierLinkNode[] }> => {
    const database = assertDatabaseName(dbName);
    const links = await getEnergyTierLinks(database);
    return { data: links };
  },

  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const existing = await getEnergyTierById(database, id);
    if (!existing) {
      throw new AppError("energy tier not found", 404);
    }
    const deleted = await deleteEnergyTier(database, id);
    if (!deleted) {
      throw new AppError("energy tier not found", 404);
    }
  },

  link: async (payload: unknown, dbName: unknown) => {
    const database = assertDatabaseName(dbName);
    const input = validateLinkPayload(payload);

    const [previous, current] = await Promise.all([
      getEnergyTierById(database, input.previousId),
      getEnergyTierById(database, input.currentId),
    ]);

    if (!previous || !current) {
      throw new AppError("energy tier not found", 404);
    }

    const updatedAt = new Date().toISOString();
    const link = await linkEnergyTiers(database, { ...input, updatedAt });
    return { data: link };
  },

  unlink: async (payload: unknown, dbName: unknown) => {
    const database = assertDatabaseName(dbName);
    const input = validateLinkPayload(payload);
    const deleted = await unlinkEnergyTiers(database, input.previousId, input.currentId);
    if (!deleted) {
      throw new AppError("energy tier link not found", 404);
    }
    return { message: "Energy tier link removed" };
  },
};
