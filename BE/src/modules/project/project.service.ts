import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  createProject,
  createProjectDatabase,
  dropProjectDatabase,
  getAllProjects,
  listDatabases,
} from "./project.repo";
import { ensureConstraintsForDatabase } from "../../database";
import { ProjectInput, ProjectNode, ProjectStatus } from "./project.types";

const STATUSES: ProjectStatus[] = ["active", "archived"];

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

const assertOptionalNonEmptyString = (
  value: unknown,
  field: string
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`${field} must be a non-empty string`, 400);
  }
  return value.trim();
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
  const dbName = assertRequiredString(value, "dbName");
  const isValid = /^[A-Za-z0-9_-]+$/.test(dbName);
  if (!isValid) {
    throw new AppError(
      "dbName must contain only letters, numbers, underscores, or hyphens",
      400
    );
  }
  return dbName;
};

const buildProjectNode = (payload: ProjectInput): ProjectNode => {
  const now = new Date().toISOString();
  return {
    ...payload,
    id: payload.id ?? generateId(),
    status: payload.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
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

const validateProjectPayload = (payload: unknown): ProjectInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
    dbName: assertDatabaseName(data.dbName),
  };

  addIfDefined(result, "id", assertOptionalNonEmptyString(data.id, "id"));
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, STATUSES, "status")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as ProjectInput;
};

const buildDatabaseIdentifier = (dbName: string): string => `\`${dbName}\``;

export const projectService = {
  create: async (payload: unknown): Promise<ProjectNode> => {
    const validated = validateProjectPayload(payload);
    const node = buildProjectNode(validated);
    const databaseIdentifier = buildDatabaseIdentifier(node.dbName);
    await createProjectDatabase(databaseIdentifier);
    try {
      await ensureConstraintsForDatabase(node.dbName);
      return await createProject(node);
    } catch (error) {
      try {
        await dropProjectDatabase(databaseIdentifier);
      } catch (cleanupError) {
        console.warn("Failed to drop database after project creation error", {
          cleanupError,
        });
      }
      throw error;
    }
  },
  getAll: async (): Promise<ProjectNode[]> => {
    const [projects, databases] = await Promise.all([
      getAllProjects(),
      listDatabases(),
    ]);
    const now = new Date().toISOString();
    const projectByDb = new Map(projects.map((project) => [project.dbName, project]));
    return databases.map((dbName) => {
      const existing = projectByDb.get(dbName);
      if (existing) {
        return existing;
      }
      return {
        id: `db:${dbName}`,
        name: dbName,
        dbName,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
    });
  },
};
