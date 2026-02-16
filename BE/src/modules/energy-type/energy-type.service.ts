import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createEnergyType,
  deleteEnergyConversion,
  deleteEnergyType,
  getEnergyConversions,
  getEnergyTypeByCode,
  getEnergyTypeById,
  getEnergyTypes,
  upsertEnergyConversion,
  updateEnergyType,
} from "./energy-type.repo";
import {
  EnergyConversionInput,
  EnergyConversionNode,
  EnergyTypeInput,
  EnergyTypeListQuery,
  EnergyTypeNode,
} from "./energy-type.types";

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

const assertOptionalNumberArray = (
  value: unknown,
  field: string
): number[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new AppError(`${field} must be an array of numbers`, 400);
  }
  const parsed = value.map((item, index) => {
    if (typeof item !== "number" || !Number.isFinite(item)) {
      throw new AppError(`${field}[${index}] must be a number`, 400);
    }
    return item;
  });
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

const validatePayload = (payload: unknown): EnergyTypeInput => {
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
    "levelCount",
    assertOptionalNumber(data.levelCount, "levelCount")
  );
  addIfDefined(
    result,
    "levelRatios",
    assertOptionalNumberArray(data.levelRatios, "levelRatios")
  );
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

  const levelCount = result.levelCount as number | undefined;
  const levelRatios = result.levelRatios as number[] | undefined;
  if (levelCount !== undefined) {
    if (!Number.isInteger(levelCount) || levelCount < 1) {
      throw new AppError("levelCount must be an integer >= 1", 400);
    }
  }
  if (levelRatios !== undefined && levelCount !== undefined) {
    if (levelRatios.length !== levelCount) {
      throw new AppError("levelRatios length must equal levelCount", 400);
    }
  }

  return result as EnergyTypeInput;
};

const parseListQuery = (query: unknown): EnergyTypeListQuery => {
  if (!query || typeof query !== "object") {
    return { activeOnly: true };
  }

  const data = query as Record<string, unknown>;
  return {
    activeOnly: parseOptionalQueryBoolean(data.activeOnly, "activeOnly") ?? true,
  };
};

const validateConversionPayload = (payload: unknown): EnergyConversionInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const fromId = assertRequiredString(data.fromId, "fromId");
  const toId = assertRequiredString(data.toId, "toId");
  if (fromId === toId) {
    throw new AppError("fromId and toId must be different", 400);
  }

  const result: EnergyConversionInput = {
    fromId,
    toId,
  };
  addIfDefined(result, "ratio", assertOptionalNumber(data.ratio, "ratio"));
  addIfDefined(
    result,
    "lossRate",
    assertOptionalNumber(data.lossRate, "lossRate")
  );
  addIfDefined(
    result,
    "condition",
    assertOptionalString(data.condition, "condition")
  );
  addIfDefined(result, "color", assertOptionalString(data.color, "color"));
  addIfDefined(
    result,
    "isActive",
    assertOptionalBoolean(data.isActive, "isActive")
  );
  return result;
};

const buildNode = (payload: EnergyTypeInput): EnergyTypeNode => {
  const now = new Date().toISOString();
  const node: EnergyTypeNode = {
    id: payload.id ?? generateId(),
    code: normalizeCode(payload.code),
    name: payload.name,
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
  if (payload.levelCount !== undefined) {
    node.levelCount = payload.levelCount;
  }
  if (payload.levelRatios !== undefined) {
    node.levelRatios = payload.levelRatios;
  }
  return node;
};

const assertCodeAvailable = async (
  database: string,
  code: string,
  excludedId?: string
): Promise<void> => {
  const existing = await getEnergyTypeByCode(database, code);
  if (existing && existing.id !== excludedId) {
    throw new AppError("energy type code already exists", 409);
  }
};

export const energyTypeService = {
  create: async (payload: unknown, dbName: unknown): Promise<EnergyTypeNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validatePayload(payload);
    const node = buildNode(validated);
    await assertCodeAvailable(database, node.code);
    return createEnergyType(database, node);
  },

  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<EnergyTypeNode> => {
    const database = assertDatabaseName(dbName);

    const existing = await getEnergyTypeById(database, id);
    if (!existing) {
      throw new AppError("energy type not found", 404);
    }

    const validated = validatePayload(payload);
    await assertCodeAvailable(database, validated.code, id);

    const updatedAt = new Date().toISOString();
    const node: EnergyTypeNode = {
      ...existing,
      ...validated,
      id,
      code: normalizeCode(validated.code),
      isActive: validated.isActive ?? existing.isActive,
      updatedAt,
    };

    const updated = await updateEnergyType(database, node);
    if (!updated) {
      throw new AppError("energy type not found", 404);
    }
    return updated;
  },

  getAll: async (
    dbName: unknown,
    query: unknown
  ): Promise<EnergyTypeNode[]> => {
    const database = assertDatabaseName(dbName);
    const parsed = parseListQuery(query);
    return getEnergyTypes(database, parsed.activeOnly ?? true);
  },

  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const existing = await getEnergyTypeById(database, id);
    if (!existing) {
      throw new AppError("energy type not found", 404);
    }
    const deleted = await deleteEnergyType(database, id);
    if (!deleted) {
      throw new AppError("energy type not found", 404);
    }
  },

  getConversions: async (dbName: unknown): Promise<EnergyConversionNode[]> => {
    const database = assertDatabaseName(dbName);
    return getEnergyConversions(database);
  },

  upsertConversion: async (
    payload: unknown,
    dbName: unknown
  ): Promise<EnergyConversionNode> => {
    const database = assertDatabaseName(dbName);
    const input = validateConversionPayload(payload);
    const [from, to] = await Promise.all([
      getEnergyTypeById(database, input.fromId),
      getEnergyTypeById(database, input.toId),
    ]);
    if (!from || !to) {
      throw new AppError("energy type not found", 404);
    }
    const now = new Date().toISOString();
    const conversionPayload: {
      fromId: string;
      toId: string;
      ratio?: number;
      lossRate?: number;
      condition?: string;
      color?: string;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    } = {
      fromId: input.fromId,
      toId: input.toId,
      isActive: input.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    if (input.ratio !== undefined) {
      conversionPayload.ratio = input.ratio;
    }
    if (input.lossRate !== undefined) {
      conversionPayload.lossRate = input.lossRate;
    }
    if (input.condition !== undefined) {
      conversionPayload.condition = input.condition;
    }
    if (input.color !== undefined) {
      conversionPayload.color = input.color;
    }
    const conversion = await upsertEnergyConversion(database, conversionPayload);
    if (!conversion) {
      throw new AppError("failed to save conversion", 500);
    }
    return conversion;
  },

  deleteConversion: async (
    fromId: string,
    toId: string,
    dbName: unknown
  ): Promise<void> => {
    const database = assertDatabaseName(dbName);
    if (!fromId || !toId) {
      throw new AppError("fromId and toId are required", 400);
    }
    if (fromId === toId) {
      throw new AppError("fromId and toId must be different", 400);
    }
    const deleted = await deleteEnergyConversion(database, fromId, toId);
    if (!deleted) {
      throw new AppError("energy conversion not found", 404);
    }
  },
};
