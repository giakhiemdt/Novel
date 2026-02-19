import { AppError } from "../../shared/errors/app-error";
import { generateId } from "../../shared/utils/generate-id";
import {
  checkEventExists,
  checkSubjectExists,
  checkTimelineAxisExists,
  createTimelineStateChange,
  deleteTimelineStateChange,
  getTimelineMarkerById,
  getTimelineStateChangeCount,
  getTimelineStateSnapshot,
  getTimelineStateChanges,
  updateTimelineStateChange,
} from "./timeline-state-change.repo";
import {
  TIMELINE_STATE_CHANGE_STATUSES,
  TimelineHistoryQuery,
  TimelineProjectionQuery,
  TimelineStateProjectionField,
  TimelineStateProjectionSubject,
  TimelineStateHistoryEntry,
  TIMELINE_SUBJECT_TYPES,
  TimelineSnapshotQuery,
  TimelineStateChangeInput,
  TimelineStateChangeListQuery,
  TimelineStateChangeNode,
} from "./timeline-state-change.types";

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

const assertRequiredNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError(`${field} is required`, 400);
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

const validateStateChangePayload = (payload: unknown): TimelineStateChangeInput => {
  if (!payload || typeof payload !== "object") {
    throw new AppError("payload must be an object", 400);
  }

  const data = payload as Record<string, unknown>;
  const effectiveTick = assertRequiredNumber(data.effectiveTick, "effectiveTick");
  const result: Record<string, unknown> = {
    axisId: assertRequiredString(data.axisId, "axisId"),
    subjectType: assertOptionalEnum(
      data.subjectType,
      TIMELINE_SUBJECT_TYPES,
      "subjectType"
    ),
    subjectId: assertRequiredString(data.subjectId, "subjectId"),
    fieldPath: assertRequiredString(data.fieldPath, "fieldPath"),
    effectiveTick,
  };

  addIfDefined(result, "id", assertOptionalString(data.id, "id"));
  addIfDefined(result, "eraId", assertOptionalString(data.eraId, "eraId"));
  addIfDefined(
    result,
    "segmentId",
    assertOptionalString(data.segmentId, "segmentId")
  );
  addIfDefined(result, "markerId", assertOptionalString(data.markerId, "markerId"));
  addIfDefined(result, "eventId", assertOptionalString(data.eventId, "eventId"));
  addIfDefined(
    result,
    "changeType",
    assertOptionalString(data.changeType, "changeType")
  );
  addIfDefined(result, "oldValue", assertOptionalString(data.oldValue, "oldValue"));
  addIfDefined(result, "newValue", assertOptionalString(data.newValue, "newValue"));
  addIfDefined(result, "detail", assertOptionalString(data.detail, "detail"));
  addIfDefined(result, "notes", assertOptionalString(data.notes, "notes"));
  addIfDefined(result, "tags", assertOptionalStringArray(data.tags, "tags"));
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(
      data.status,
      TIMELINE_STATE_CHANGE_STATUSES,
      "status"
    )
  );

  if (!result.subjectType) {
    throw new AppError("subjectType is required", 400);
  }

  return result as TimelineStateChangeInput;
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

const parseStateChangeListQuery = (
  query: unknown
): TimelineStateChangeListQuery => {
  if (!query || typeof query !== "object") {
    return { limit: 50, offset: 0 };
  }

  const data = query as Record<string, unknown>;
  const result: TimelineStateChangeListQuery = parsePagination(data);

  addIfDefined(result, "q", parseOptionalQueryString(data.q, "q"));
  addIfDefined(result, "axisId", parseOptionalQueryString(data.axisId, "axisId"));
  addIfDefined(result, "eraId", parseOptionalQueryString(data.eraId, "eraId"));
  addIfDefined(
    result,
    "segmentId",
    parseOptionalQueryString(data.segmentId, "segmentId")
  );
  addIfDefined(
    result,
    "markerId",
    parseOptionalQueryString(data.markerId, "markerId")
  );
  addIfDefined(result, "eventId", parseOptionalQueryString(data.eventId, "eventId"));
  addIfDefined(
    result,
    "subjectType",
    assertOptionalEnum(data.subjectType, TIMELINE_SUBJECT_TYPES, "subjectType")
  );
  addIfDefined(
    result,
    "subjectId",
    parseOptionalQueryString(data.subjectId, "subjectId")
  );
  addIfDefined(
    result,
    "fieldPath",
    parseOptionalQueryString(data.fieldPath, "fieldPath")
  );
  addIfDefined(
    result,
    "status",
    assertOptionalEnum(
      data.status,
      TIMELINE_STATE_CHANGE_STATUSES,
      "status"
    )
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

const parseSnapshotQuery = (query: unknown): TimelineSnapshotQuery => {
  if (!query || typeof query !== "object") {
    throw new AppError("axisId and tick are required", 400);
  }
  const data = query as Record<string, unknown>;
  const axisId = assertRequiredString(data.axisId, "axisId");
  const tick = parseOptionalQueryNumber(data.tick, "tick");
  if (tick === undefined) {
    throw new AppError("tick is required", 400);
  }
  const result: TimelineSnapshotQuery = { axisId, tick };
  addIfDefined(
    result,
    "subjectType",
    assertOptionalEnum(data.subjectType, TIMELINE_SUBJECT_TYPES, "subjectType")
  );
  addIfDefined(
    result,
    "subjectId",
    parseOptionalQueryString(data.subjectId, "subjectId")
  );
  return result;
};

const parseProjectionQuery = (query: unknown): TimelineProjectionQuery =>
  parseSnapshotQuery(query);

const parseHistoryQuery = (query: unknown): TimelineHistoryQuery => {
  if (!query || typeof query !== "object") {
    throw new AppError("axisId, subjectType, and subjectId are required", 400);
  }
  const data = query as Record<string, unknown>;
  const axisId = assertRequiredString(data.axisId, "axisId");
  const subjectType = assertOptionalEnum(
    data.subjectType,
    TIMELINE_SUBJECT_TYPES,
    "subjectType"
  );
  const subjectId = assertRequiredString(data.subjectId, "subjectId");
  if (!subjectType) {
    throw new AppError("subjectType is required", 400);
  }

  const fieldPath = parseOptionalQueryString(data.fieldPath, "fieldPath");
  const status =
    assertOptionalEnum(data.status, TIMELINE_STATE_CHANGE_STATUSES, "status") ??
    "active";
  const tickFrom = parseOptionalQueryNumber(data.tickFrom, "tickFrom");
  const tickTo = parseOptionalQueryNumber(data.tickTo, "tickTo");
  const limit = parseOptionalQueryNumber(data.limit, "limit") ?? 200;

  if (typeof tickFrom === "number" && typeof tickTo === "number" && tickTo < tickFrom) {
    throw new AppError("tickTo must be >= tickFrom", 400);
  }
  if (limit <= 0) {
    throw new AppError("limit must be > 0", 400);
  }
  if (limit > 1000) {
    throw new AppError("limit must be <= 1000", 400);
  }

  const result: TimelineHistoryQuery = {
    axisId,
    subjectType,
    subjectId,
    status,
    limit,
  };
  addIfDefined(result, "fieldPath", fieldPath);
  addIfDefined(result, "tickFrom", tickFrom);
  addIfDefined(result, "tickTo", tickTo);
  return result;
};

const parseSerializedValue = (value: string | undefined): unknown => {
  if (value === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizePathTokens = (fieldPath: string): string[] =>
  fieldPath
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

const setFieldValueByPath = (
  root: Record<string, unknown>,
  fieldPath: string,
  value: unknown
): void => {
  const tokens = normalizePathTokens(fieldPath);
  if (tokens.length === 0) {
    return;
  }
  let current: Record<string, unknown> = root;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) {
      continue;
    }
    const isLast = index === tokens.length - 1;

    if (isLast) {
      current[token] = value;
      return;
    }

    const existing = current[token];
    if (existing && typeof existing === "object" && !Array.isArray(existing)) {
      current = existing as Record<string, unknown>;
      continue;
    }

    const childContainer: Record<string, unknown> = {};
    current[token] = childContainer;
    current = childContainer;
  }
};

const removeFieldByPath = (
  root: Record<string, unknown>,
  fieldPath: string
): void => {
  const tokens = normalizePathTokens(fieldPath);
  if (tokens.length === 0) {
    return;
  }
  const leafToken = tokens[tokens.length - 1];
  if (!leafToken) {
    return;
  }

  let current: Record<string, unknown> = root;
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index];
    if (!token) {
      return;
    }
    const next = current[token];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      return;
    }
    current = next as Record<string, unknown>;
  }
  delete current[leafToken];
};

const cloneState = (state: Record<string, unknown>): Record<string, unknown> => {
  try {
    return JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  } catch {
    return { ...state };
  }
};

const removalChangeTypes = new Set(["remove", "delete", "unset"]);

const buildProjectionFromSnapshot = (
  snapshot: TimelineStateChangeNode[]
): TimelineStateProjectionSubject[] => {
  const grouped = new Map<string, TimelineStateProjectionSubject>();

  for (const change of snapshot) {
    const groupKey = `${change.subjectType}:${change.subjectId}`;
    const existing = grouped.get(groupKey);
    const subject: TimelineStateProjectionSubject =
      existing ??
      ({
        subjectType: change.subjectType,
        subjectId: change.subjectId,
        state: {},
        fields: [],
      } as TimelineStateProjectionSubject);

    const normalizedChangeType = (change.changeType ?? "").trim().toLowerCase();
    const isRemoval = removalChangeTypes.has(normalizedChangeType);
    const parsedValue = parseSerializedValue(change.newValue);

    if (!isRemoval) {
      if (parsedValue === undefined) {
        setFieldValueByPath(subject.state, change.fieldPath, null);
      } else {
        setFieldValueByPath(subject.state, change.fieldPath, parsedValue);
      }
    }

    const fieldData: Record<string, unknown> = {
      stateChangeId: change.id,
      fieldPath: change.fieldPath,
      effectiveTick: change.effectiveTick,
      updatedAt: change.updatedAt,
    };
    if (!isRemoval) {
      addIfDefined(fieldData, "value", parsedValue ?? null);
    }
    addIfDefined(fieldData, "rawValue", change.newValue);
    addIfDefined(fieldData, "changeType", change.changeType);
    addIfDefined(fieldData, "markerId", change.markerId);
    addIfDefined(fieldData, "eventId", change.eventId);
    const field = fieldData as TimelineStateProjectionField;
    subject.fields.push(field);
    grouped.set(groupKey, subject);
  }

  return Array.from(grouped.values());
};

const buildHistoryFromChanges = (
  changes: TimelineStateChangeNode[]
): TimelineStateHistoryEntry[] => {
  const currentState: Record<string, unknown> = {};
  const entries: TimelineStateHistoryEntry[] = [];

  for (const change of changes) {
    const normalizedChangeType = (change.changeType ?? "").trim().toLowerCase();
    const isRemoval = removalChangeTypes.has(normalizedChangeType);
    const oldValue = parseSerializedValue(change.oldValue);
    const newValue = parseSerializedValue(change.newValue);

    if (isRemoval) {
      removeFieldByPath(currentState, change.fieldPath);
    } else {
      setFieldValueByPath(currentState, change.fieldPath, newValue ?? null);
    }

    const entryData: Record<string, unknown> = {
      stateChangeId: change.id,
      effectiveTick: change.effectiveTick,
      fieldPath: change.fieldPath,
      updatedAt: change.updatedAt,
      stateAfter: cloneState(currentState),
    };
    addIfDefined(entryData, "changeType", change.changeType);
    addIfDefined(entryData, "oldValue", oldValue);
    if (!isRemoval) {
      addIfDefined(entryData, "newValue", newValue ?? null);
    }
    addIfDefined(entryData, "markerId", change.markerId);
    addIfDefined(entryData, "eventId", change.eventId);
    entries.push(entryData as TimelineStateHistoryEntry);
  }

  return entries;
};

const resolveStateChangeRefs = async (
  database: string,
  input: TimelineStateChangeInput
): Promise<TimelineStateChangeInput> => {
  const axisExists = await checkTimelineAxisExists(database, input.axisId);
  if (!axisExists) {
    throw new AppError("axis not found", 404);
  }

  if (input.markerId) {
    const marker = await getTimelineMarkerById(database, input.markerId);
    if (!marker) {
      throw new AppError("marker not found", 404);
    }
    if (marker.axisId !== input.axisId) {
      throw new AppError("marker axisId does not match axisId", 400);
    }
    if (input.eraId && marker.eraId && input.eraId !== marker.eraId) {
      throw new AppError("marker eraId does not match eraId", 400);
    }
    if (
      input.segmentId &&
      marker.segmentId &&
      input.segmentId !== marker.segmentId
    ) {
      throw new AppError("marker segmentId does not match segmentId", 400);
    }
    const resolved: Record<string, unknown> = { ...input };
    addIfDefined(resolved, "eraId", input.eraId ?? marker.eraId);
    addIfDefined(resolved, "segmentId", input.segmentId ?? marker.segmentId);
    return resolved as TimelineStateChangeInput;
  }

  return input;
};

const ensureStateChangeDependencies = async (
  database: string,
  input: TimelineStateChangeInput
): Promise<void> => {
  if (input.eventId) {
    const eventExists = await checkEventExists(database, input.eventId);
    if (!eventExists) {
      throw new AppError("event not found", 404);
    }
  }

  const subjectExists = await checkSubjectExists(
    database,
    input.subjectType,
    input.subjectId
  );
  if (!subjectExists) {
    throw new AppError("subject not found", 404);
  }
};

export const timelineStateChangeService = {
  create: async (
    payload: unknown,
    dbName: unknown
  ): Promise<TimelineStateChangeNode> => {
    const database = assertDatabaseName(dbName);
    const validated = validateStateChangePayload(payload);
    const resolvedRefs = await resolveStateChangeRefs(database, validated);
    await ensureStateChangeDependencies(database, resolvedRefs);

    const now = new Date().toISOString();
    const node: TimelineStateChangeNode = {
      ...resolvedRefs,
      id: resolvedRefs.id ?? generateId(),
      status: resolvedRefs.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };

    const created = await createTimelineStateChange(node, database);
    if (!created) {
      throw new AppError("cannot create timeline state change", 409);
    }
    return created;
  },

  update: async (
    id: string,
    payload: unknown,
    dbName: unknown
  ): Promise<TimelineStateChangeNode> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const validated = validateStateChangePayload(payload);
    const resolvedRefs = await resolveStateChangeRefs(database, validated);
    await ensureStateChangeDependencies(database, resolvedRefs);

    const now = new Date().toISOString();
    const node: TimelineStateChangeNode = {
      ...resolvedRefs,
      id: normalizedId,
      status: resolvedRefs.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };

    const updated = await updateTimelineStateChange(node, database);
    if (!updated) {
      throw new AppError("timeline state change not found", 404);
    }
    return updated;
  },

  getAll: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: TimelineStateChangeNode[]; meta: TimelineStateChangeListQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseStateChangeListQuery(query);
    const [data, total] = await Promise.all([
      getTimelineStateChanges(database, parsedQuery),
      getTimelineStateChangeCount(database, parsedQuery),
    ]);
    return { data, meta: { ...parsedQuery, total } };
  },

  getSnapshot: async (
    dbName: unknown,
    query: unknown
  ): Promise<{ data: TimelineStateChangeNode[]; meta: TimelineSnapshotQuery }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseSnapshotQuery(query);
    const axisExists = await checkTimelineAxisExists(database, parsedQuery.axisId);
    if (!axisExists) {
      throw new AppError("axis not found", 404);
    }
    const data = await getTimelineStateSnapshot(database, parsedQuery);
    return { data, meta: parsedQuery };
  },

  getProjection: async (
    dbName: unknown,
    query: unknown
  ): Promise<{
    data: TimelineStateProjectionSubject[];
    meta: TimelineProjectionQuery & { subjectCount: number; fieldCount: number };
  }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseProjectionQuery(query);
    const axisExists = await checkTimelineAxisExists(database, parsedQuery.axisId);
    if (!axisExists) {
      throw new AppError("axis not found", 404);
    }
    const snapshot = await getTimelineStateSnapshot(database, parsedQuery);
    const projected = buildProjectionFromSnapshot(snapshot);
    return {
      data: projected,
      meta: {
        ...parsedQuery,
        subjectCount: projected.length,
        fieldCount: snapshot.length,
      },
    };
  },

  getHistory: async (
    dbName: unknown,
    query: unknown
  ): Promise<{
    data: TimelineStateHistoryEntry[];
    meta: TimelineHistoryQuery & {
      total: number;
      hasMore: boolean;
      finalState: Record<string, unknown>;
    };
  }> => {
    const database = assertDatabaseName(dbName);
    const parsedQuery = parseHistoryQuery(query);
    const axisExists = await checkTimelineAxisExists(database, parsedQuery.axisId);
    if (!axisExists) {
      throw new AppError("axis not found", 404);
    }
    const subjectExists = await checkSubjectExists(
      database,
      parsedQuery.subjectType,
      parsedQuery.subjectId
    );
    if (!subjectExists) {
      throw new AppError("subject not found", 404);
    }

    const listQuery: TimelineStateChangeListQuery = {
      axisId: parsedQuery.axisId,
      subjectType: parsedQuery.subjectType,
      subjectId: parsedQuery.subjectId,
      offset: 0,
    };
    addIfDefined(listQuery, "status", parsedQuery.status);
    addIfDefined(listQuery, "limit", parsedQuery.limit);
    addIfDefined(listQuery, "fieldPath", parsedQuery.fieldPath);
    addIfDefined(listQuery, "tickFrom", parsedQuery.tickFrom);
    addIfDefined(listQuery, "tickTo", parsedQuery.tickTo);

    const [changes, total] = await Promise.all([
      getTimelineStateChanges(database, listQuery),
      getTimelineStateChangeCount(database, listQuery),
    ]);
    const history = buildHistoryFromChanges(changes);
    const lastEntry =
      history.length > 0 ? history[history.length - 1] : undefined;
    const finalState = lastEntry ? lastEntry.stateAfter : {};

    return {
      data: history,
      meta: {
        ...parsedQuery,
        total,
        hasMore: total > changes.length,
        finalState,
      },
    };
  },

  delete: async (id: string, dbName: unknown): Promise<void> => {
    const database = assertDatabaseName(dbName);
    const normalizedId = assertRequiredString(id, "id");
    const deleted = await deleteTimelineStateChange(database, normalizedId);
    if (!deleted) {
      throw new AppError("timeline state change not found", 404);
    }
  },
};
