import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createSchema,
  deleteSchemaByEntity,
  getSchemaByEntity,
  upsertSchema,
} from "./schema.repo";
import {
  EntitySchemaInput,
  EntitySchemaNode,
  SchemaField,
  SchemaFieldType,
} from "./schema.types";

const FIELD_TYPES: SchemaFieldType[] = [
  "text",
  "number",
  "textarea",
  "select",
  "multiselect",
  "boolean",
  "date",
];

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
  return value;
};

const assertOptionalStringArray = (
  value: unknown,
  field: string
): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new AppError(`${field} must be an array of strings`, 400);
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
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new AppError(`${field} must be a number`, 400);
  }
  return value;
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

const normalizeField = (field: unknown, index: number): SchemaField => {
  if (!field || typeof field !== "object") {
    throw new AppError(`fields[${index}] must be an object`, 400);
  }
  const data = field as Record<string, unknown>;
  const key = assertRequiredString(data.key, `fields[${index}].key`);
  const label = assertRequiredString(data.label, `fields[${index}].label`);
  const type = assertRequiredString(data.type, `fields[${index}].type`);
  if (!FIELD_TYPES.includes(type as SchemaFieldType)) {
    throw new AppError(`fields[${index}].type is invalid`, 400);
  }
  const options = assertOptionalStringArray(data.options, `fields[${index}].options`);
  return {
    key,
    label,
    type: type as SchemaFieldType,
    required: assertOptionalBoolean(data.required, `fields[${index}].required`),
    options,
    group: assertOptionalString(data.group, `fields[${index}].group`),
    order: assertOptionalNumber(data.order, `fields[${index}].order`),
    placeholder: assertOptionalString(data.placeholder, `fields[${index}].placeholder`),
    help: assertOptionalString(data.help, `fields[${index}].help`),
  };
};

const validateSchemaPayload = (payload: unknown): EntitySchemaInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }
  const data = payload as Record<string, unknown>;
  const fieldsRaw = data.fields;
  if (!Array.isArray(fieldsRaw)) {
    throw new AppError("fields must be an array", 400);
  }
  const fields = fieldsRaw.map(normalizeField);

  return {
    id: assertOptionalString(data.id, "id"),
    entity: assertRequiredString(data.entity, "entity"),
    title: assertOptionalString(data.title, "title"),
    fields,
  };
};

const buildSchemaNode = (payload: EntitySchemaInput): EntitySchemaNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    createdAt: now,
    updatedAt: now,
  };
};

export const schemaService = {
  getByEntity: async (
    entity: string,
    dbName: unknown
  ): Promise<EntitySchemaNode | null> => {
    const database = assertDatabaseName(dbName);
    return getSchemaByEntity(database, entity);
  },
  create: async (
    payload: unknown,
    dbName: unknown
  ): Promise<EntitySchemaNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateSchemaPayload(payload);
    const node = buildSchemaNode(validated);
    return createSchema(node, database);
  },
  upsert: async (
    payload: unknown,
    dbName: unknown
  ): Promise<EntitySchemaNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateSchemaPayload(payload);
    const node = buildSchemaNode(validated);
    return upsertSchema(node, database);
  },
  deleteByEntity: async (entity: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const deleted = await deleteSchemaByEntity(database, entity);
    if (!deleted) {
      throw new AppError("schema not found", 404);
    }
  },
};
