import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  checkTimelineAxisExists,
  countMainTimelineAxes,
  createTimelineAxis,
  createTimelineEra,
  createTimelineMarker,
  createTimelineSegment,
  deleteTimelineAxis,
  deleteTimelineEra,
  deleteTimelineMarker,
  deleteTimelineSegment,
  getTimelineAxisCount,
  getTimelineAxes,
  getTimelineEraById,
  getTimelineEraCount,
  getTimelineEras,
  getTimelineMarkerCount,
  getTimelineMarkers,
  getTimelineSegmentById,
  getTimelineSegmentCount,
  getTimelineSegments,
  updateTimelineAxis,
  updateTimelineEra,
  updateTimelineMarker,
  updateTimelineSegment,
} from "./timeline-structure.repo";
import {
  TIMELINE_AXIS_TYPES,
  TIMELINE_STRUCT_STATUSES,
  TimelineAxisInput,
  TimelineAxisListQuery,
  TimelineAxisNode,
  TimelineAxisType,
  TimelineEraInput,
  TimelineEraListQuery,
  TimelineEraNode,
  TimelineMarkerInput,
  TimelineMarkerListQuery,
  TimelineMarkerNode,
  TimelineSegmentInput,
  TimelineSegmentListQuery,
  TimelineSegmentNode,
  TimelineStructStatus,
} from "./timeline-structure.types";

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
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
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

const assertRequiredNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError(`${field} is required`, 400);
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

const assertOptionalEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
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
  if (!/^[A-Za-z0-9_-]+$/.test(dbName)) {
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

const validateTickRange = (
  startTick: number | undefined,
  endTick: number | undefined,
  startField: string,
  endField: string
): void => {
  if (
    typeof startTick === "number" &&
    typeof endTick === "number" &&
    endTick < startTick
  ) {
    throw new AppError(`${endField} must be >= ${startField}`, 400);
  }
};

const validateOrder = (value: number | undefined, field: string): void => {
  if (value !== undefined && value < 0) {
    throw new AppError(`${field} must be >= 0`, 400);
  }
};

const validateAxisPayload = (payload: unknown): TimelineAxisInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "code", assertOptionalString(data.code, "code"));
  addIfDefined(
    result,
    "axisType",
    assertOptionalEnum(data.axisType, TIMELINE_AXIS_TYPES, "axisType")
  );
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(
    result,
    "parentAxisId",
    assertOptionalString(data.parentAxisId, "parentAxisId")
  );
  addIfDefined(
    result,
    "originSegmentId",
    assertOptionalString(data.originSegmentId, "originSegmentId")
  );
  addIfDefined(
    result,
    "originOffsetYears",
    assertOptionalNumber(data.originOffsetYears, "originOffsetYears")
  );
  addIfDefined(result, "policy", assertOptionalString(data.policy, "policy"));
  addIfDefined(
    result,
    "sortOrder",
    assertOptionalNumber(data.sortOrder, "sortOrder")
  );
  addIfDefined(
    result,
    "startTick",
    assertOptionalNumber(data.startTick, "startTick")
  );
  addIfDefined(
    result,
    "endTick",
    assertOptionalNumber(data.endTick, "endTick")
  );
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, TIMELINE_STRUCT_STATUSES, "status")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  validateOrder(result.sortOrder as number | undefined, "sortOrder");
  const originOffsetYears = result.originOffsetYears as number | undefined;
  if (originOffsetYears !== undefined && originOffsetYears < 0) {
    throw new AppError("originOffsetYears must be >= 0", 400);
  }
  validateTickRange(
    result.startTick as number | undefined,
    result.endTick as number | undefined,
    "startTick",
    "endTick"
  );

  return result as TimelineAxisInput;
};

const validateEraPayload = (payload: unknown): TimelineEraInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const result: Record<string, unknown> = {
    axisId: assertRequiredString(data.axisId, "axisId"),
    name: assertRequiredString(data.name, "name"),
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "code", assertOptionalString(data.code, "code"));
  addIfDefined(
    result,
    "summary",
    assertOptionalString(data.summary, "summary")
  );
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(result, "order", assertOptionalNumber(data.order, "order"));
  addIfDefined(
    result,
    "startTick",
    assertOptionalNumber(data.startTick, "startTick")
  );
  addIfDefined(
    result,
    "endTick",
    assertOptionalNumber(data.endTick, "endTick")
  );
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, TIMELINE_STRUCT_STATUSES, "status")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  validateOrder(result.order as number | undefined, "order");
  validateTickRange(
    result.startTick as number | undefined,
    result.endTick as number | undefined,
    "startTick",
    "endTick"
  );

  return result as TimelineEraInput;
};

const validateSegmentPayload = (payload: unknown): TimelineSegmentInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const durationYears = assertRequiredNumber(data.durationYears, "durationYears");
  if (durationYears <= 0) {
    throw new AppError("durationYears must be > 0", 400);
  }
  const result: Record<string, unknown> = {
    eraId: assertRequiredString(data.eraId, "eraId"),
    name: assertRequiredString(data.name, "name"),
    durationYears,
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "code", assertOptionalString(data.code, "code"));
  addIfDefined(
    result,
    "summary",
    assertOptionalString(data.summary, "summary")
  );
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(result, "order", assertOptionalNumber(data.order, "order"));
  addIfDefined(
    result,
    "startTick",
    assertOptionalNumber(data.startTick, "startTick")
  );
  addIfDefined(
    result,
    "endTick",
    assertOptionalNumber(data.endTick, "endTick")
  );
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, TIMELINE_STRUCT_STATUSES, "status")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  validateOrder(result.order as number | undefined, "order");
  validateTickRange(
    result.startTick as number | undefined,
    result.endTick as number | undefined,
    "startTick",
    "endTick"
  );

  return result as TimelineSegmentInput;
};

const validateMarkerPayload = (payload: unknown): TimelineMarkerInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const tick = assertRequiredNumber(data.tick, "tick");

  const result: Record<string, unknown> = {
    segmentId: assertRequiredString(data.segmentId, "segmentId"),
    label: assertRequiredString(data.label, "label"),
    tick,
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(
    result,
    "markerType",
    assertOptionalString(data.markerType, "markerType")
  );
  addIfDefined(
    result,
    "description",
    assertOptionalString(data.description, "description")
  );
  addIfDefined(
    result,
    "eventRefId",
    assertOptionalString(data.eventRefId, "eventRefId")
  );
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, TIMELINE_STRUCT_STATUSES, "status")
  );
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));

  return result as TimelineMarkerInput;
};

const parsePagination = (query: Record<string, unknown>) => {
  const limit = parseOptionalQueryNumber(query.limit, "limit");
  const offset = parseOptionalQueryNumber(query.offset, "offset");

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

  return { limit: normalizedLimit, offset: normalizedOffset };
};

const parseAxisListQuery = (query: unknown): TimelineAxisListQuery => {
  if (!query || typeof query !== "object") {
    return { limit: 50, offset: 0 };
  }
  const data = query as Record<string, unknown>;
  const result: TimelineAxisListQuery = parsePagination(data);

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "code", parseOptionalQueryString(data.code, "code"));
  addIfDefined(
    result,
    "axisType",
    assertOptionalEnum(data.axisType, TIMELINE_AXIS_TYPES, "axisType")
  );
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, TIMELINE_STRUCT_STATUSES, "status")
  );
  addIfDefined(
    result,
    "parentAxisId",
    parseOptionalQueryString(data.parentAxisId, "parentAxisId")
  );

  return result;
};

const parseEraListQuery = (query: unknown): TimelineEraListQuery => {
  if (!query || typeof query !== "object") {
    return { limit: 50, offset: 0 };
  }
  const data = query as Record<string, unknown>;
  const result: TimelineEraListQuery = parsePagination(data);

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "code", parseOptionalQueryString(data.code, "code"));
  addIfDefined(
    result,
    "axisId",
    parseOptionalQueryString(data.axisId, "axisId")
  );
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, TIMELINE_STRUCT_STATUSES, "status")
  );

  return result;
};

const parseSegmentListQuery = (query: unknown): TimelineSegmentListQuery => {
  if (!query || typeof query !== "object") {
    return { limit: 50, offset: 0 };
  }
  const data = query as Record<string, unknown>;
  const result: TimelineSegmentListQuery = parsePagination(data);

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "name", parseOptionalQueryString(data.name, "name"));
  addIfDefined(result, "code", parseOptionalQueryString(data.code, "code"));
  addIfDefined(
    result,
    "axisId",
    parseOptionalQueryString(data.axisId, "axisId")
  );
  addIfDefined(result, "eraId", parseOptionalQueryString(data.eraId, "eraId"));
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, TIMELINE_STRUCT_STATUSES, "status")
  );

  return result;
};

const parseMarkerListQuery = (query: unknown): TimelineMarkerListQuery => {
  if (!query || typeof query !== "object") {
    return { limit: 50, offset: 0 };
  }
  const data = query as Record<string, unknown>;
  const result: TimelineMarkerListQuery = parsePagination(data);

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "label", parseOptionalQueryString(data.label, "label"));
  addIfDefined(
    result,
    "markerType",
    parseOptionalQueryString(data.markerType, "markerType")
  );
  addIfDefined(
    result,
    "axisId",
    parseOptionalQueryString(data.axisId, "axisId")
  );
  addIfDefined(result, "eraId", parseOptionalQueryString(data.eraId, "eraId"));
  addIfDefined(
    result,
    "segmentId",
    parseOptionalQueryString(data.segmentId, "segmentId")
  );
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(data.status, TIMELINE_STRUCT_STATUSES, "status")
  );
  const tickFrom = parseOptionalQueryNumber(data.tickFrom, "tickFrom");
  const tickTo = parseOptionalQueryNumber(data.tickTo, "tickTo");
  addIfDefined(result, "tickFrom", tickFrom);
  addIfDefined(result, "tickTo", tickTo);

  if (
    typeof tickFrom === "number" &&
    typeof tickTo === "number" &&
    tickTo < tickFrom
  ) {
    throw new AppError("tickTo must be >= tickFrom", 400);
  }

  return result;
};

export const timelineStructureService = {
  createAxis: async (
    payload: unknown,
    dbName: unknown
  ): Promise<TimelineAxisNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateAxisPayload(payload);
    const axisType = validated.axisType ?? "main";
    const requiresParentAxis = axisType === "branch" || axisType === "loop";
    const requiresOriginSegment = axisType === "branch";
    const parentAxisId = validated.parentAxisId;
    const originSegmentId = validated.originSegmentId;

    if (axisType === "main") {
      const mainAxisCount = await countMainTimelineAxes(database);
      if (mainAxisCount > 0) {
        throw new AppError("only one main axis is allowed", 409);
      }
    }

    if (requiresParentAxis && !parentAxisId) {
      throw new AppError("parent axis is required for branch and loop axes", 400);
    }
    if (!requiresParentAxis && parentAxisId) {
      throw new AppError("only branch and loop axes can have parent axis", 400);
    }
    if (requiresOriginSegment && !originSegmentId) {
      throw new AppError("origin segment is required for branch axis", 400);
    }
    if (!requiresOriginSegment && (originSegmentId || validated.originOffsetYears !== undefined)) {
      throw new AppError("only branch axis can set origin segment", 400);
    }

    const nodeId = validated.id ?? generateId();
    if (parentAxisId) {
      if (parentAxisId === nodeId) {
        throw new AppError("parentAxisId must be different from id", 400);
      }
      const parentExists = await checkTimelineAxisExists(database, parentAxisId);
      if (!parentExists) {
        throw new AppError("parent axis not found", 404);
      }
    }
    if (originSegmentId) {
      const segment = await getTimelineSegmentById(database, originSegmentId);
      if (!segment) {
        throw new AppError("origin segment not found", 404);
      }
      if (!parentAxisId || segment.axisId !== parentAxisId) {
        throw new AppError("origin segment must belong to parent axis", 400);
      }
    }

    const now = new Date().toISOString();
    const node: TimelineAxisNode = {
      ...validated,
      id: nodeId,
      axisType,
      status: validated.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };
    return createTimelineAxis(node, database);
  },

  updateAxis: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<TimelineAxisNode> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const validated = validateAxisPayload(payload);
    const axisType = validated.axisType ?? "main";
    const requiresParentAxis = axisType === "branch" || axisType === "loop";
    const requiresOriginSegment = axisType === "branch";
    const parentAxisId = validated.parentAxisId;
    const originSegmentId = validated.originSegmentId;

    if (axisType === "main") {
      const mainAxisCount = await countMainTimelineAxes(database, normalizedId);
      if (mainAxisCount > 0) {
        throw new AppError("only one main axis is allowed", 409);
      }
    }

    if (requiresParentAxis && !parentAxisId) {
      throw new AppError("parent axis is required for branch and loop axes", 400);
    }
    if (!requiresParentAxis && parentAxisId) {
      throw new AppError("only branch and loop axes can have parent axis", 400);
    }
    if (requiresOriginSegment && !originSegmentId) {
      throw new AppError("origin segment is required for branch axis", 400);
    }
    if (!requiresOriginSegment && (originSegmentId || validated.originOffsetYears !== undefined)) {
      throw new AppError("only branch axis can set origin segment", 400);
    }

    if (parentAxisId) {
      if (parentAxisId === normalizedId) {
        throw new AppError("parentAxisId must be different from id", 400);
      }
      const parentExists = await checkTimelineAxisExists(database, parentAxisId);
      if (!parentExists) {
        throw new AppError("parent axis not found", 404);
      }
    }
    if (originSegmentId) {
      const segment = await getTimelineSegmentById(database, originSegmentId);
      if (!segment) {
        throw new AppError("origin segment not found", 404);
      }
      if (!parentAxisId || segment.axisId !== parentAxisId) {
        throw new AppError("origin segment must belong to parent axis", 400);
      }
    }

    const now = new Date().toISOString();
    const node: TimelineAxisNode = {
      ...validated,
      id: normalizedId,
      axisType,
      status: validated.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };
    const updated = await updateTimelineAxis(node, database);
    if (!updated) {
      throw new AppError("timeline axis not found", 404);
    }
    return updated;
  },

  getAxes: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: TimelineAxisNode[]; meta: TimelineAxisListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseAxisListQuery(query);
    const [data, total] = await Promise.all([
      getTimelineAxes(database, parsedQuery),
      getTimelineAxisCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },

  deleteAxis: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const deleted = await deleteTimelineAxis(database, normalizedId);
    if (!deleted) {
      throw new AppError("timeline axis not found", 404);
    }
  },

  createEra: async (payload: unknown, dbName: unknown): Promise<TimelineEraNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateEraPayload(payload);

    const axisExists = await checkTimelineAxisExists(database, validated.axisId);
    if (!axisExists) {
      throw new AppError("axis not found", 404);
    }

    const now = new Date().toISOString();
    const node: TimelineEraNode = {
      ...validated,
      id: validated.id ?? generateId(),
      status: validated.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };

    const created = await createTimelineEra(node, database);
    if (!created) {
      throw new AppError("axis not found", 404);
    }
    return created;
  },

  updateEra: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<TimelineEraNode> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const validated = validateEraPayload(payload);

    const axisExists = await checkTimelineAxisExists(database, validated.axisId);
    if (!axisExists) {
      throw new AppError("axis not found", 404);
    }

    const now = new Date().toISOString();
    const node: TimelineEraNode = {
      ...validated,
      id: normalizedId,
      status: validated.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };

    const updated = await updateTimelineEra(node, database);
    if (!updated) {
      throw new AppError("timeline era not found", 404);
    }
    return updated;
  },

  getEras: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: TimelineEraNode[]; meta: TimelineEraListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseEraListQuery(query);
    const [data, total] = await Promise.all([
      getTimelineEras(database, parsedQuery),
      getTimelineEraCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },

  deleteEra: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const deleted = await deleteTimelineEra(database, normalizedId);
    if (!deleted) {
      throw new AppError("timeline era not found", 404);
    }
  },

  createSegment: async (
    payload: unknown,
    dbName: unknown
  ): Promise<TimelineSegmentNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateSegmentPayload(payload);

    const era = await getTimelineEraById(database, validated.eraId);
    if (!era) {
      throw new AppError("era not found", 404);
    }

    const now = new Date().toISOString();
    const node: TimelineSegmentNode = {
      ...validated,
      id: validated.id ?? generateId(),
      axisId: era.axisId,
      status: validated.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };

    const created = await createTimelineSegment(node, database);
    if (!created) {
      throw new AppError("era not found", 404);
    }
    return created;
  },

  updateSegment: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<TimelineSegmentNode> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const validated = validateSegmentPayload(payload);

    const era = await getTimelineEraById(database, validated.eraId);
    if (!era) {
      throw new AppError("era not found", 404);
    }

    const now = new Date().toISOString();
    const node: TimelineSegmentNode = {
      ...validated,
      id: normalizedId,
      axisId: era.axisId,
      status: validated.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };

    const updated = await updateTimelineSegment(node, database);
    if (!updated) {
      throw new AppError("timeline segment not found", 404);
    }
    return updated;
  },

  getSegments: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: TimelineSegmentNode[]; meta: TimelineSegmentListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseSegmentListQuery(query);
    const [data, total] = await Promise.all([
      getTimelineSegments(database, parsedQuery),
      getTimelineSegmentCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },

  deleteSegment: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const deleted = await deleteTimelineSegment(database, normalizedId);
    if (!deleted) {
      throw new AppError("timeline segment not found", 404);
    }
  },

  createMarker: async (
    payload: unknown,
    dbName: unknown
  ): Promise<TimelineMarkerNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateMarkerPayload(payload);

    const segment = await getTimelineSegmentById(database, validated.segmentId);
    if (!segment) {
      throw new AppError("segment not found", 404);
    }

    const now = new Date().toISOString();
    const node: TimelineMarkerNode = {
      ...validated,
      id: validated.id ?? generateId(),
      axisId: segment.axisId,
      eraId: segment.eraId,
      status: validated.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };

    const created = await createTimelineMarker(node, database);
    if (!created) {
      throw new AppError("segment not found", 404);
    }
    return created;
  },

  updateMarker: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<TimelineMarkerNode> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const validated = validateMarkerPayload(payload);

    const segment = await getTimelineSegmentById(database, validated.segmentId);
    if (!segment) {
      throw new AppError("segment not found", 404);
    }

    const now = new Date().toISOString();
    const node: TimelineMarkerNode = {
      ...validated,
      id: normalizedId,
      axisId: segment.axisId,
      eraId: segment.eraId,
      status: validated.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };

    const updated = await updateTimelineMarker(node, database);
    if (!updated) {
      throw new AppError("timeline marker not found", 404);
    }
    return updated;
  },

  getMarkers: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: TimelineMarkerNode[]; meta: TimelineMarkerListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseMarkerListQuery(query);
    const [data, total] = await Promise.all([
      getTimelineMarkers(database, parsedQuery),
      getTimelineMarkerCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },

  deleteMarker: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const deleted = await deleteTimelineMarker(database, normalizedId);
    if (!deleted) {
      throw new AppError("timeline marker not found", 404);
    }
  },
};
