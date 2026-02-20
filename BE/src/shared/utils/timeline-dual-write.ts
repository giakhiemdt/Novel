import { FastifyRequest } from "fastify";
import { timelineStateChangeService } from "../../modules/timeline-state-change/timeline-state-change.service";
import { TimelineSubjectType } from "../../modules/timeline-state-change/timeline-state-change.types";
import { auditTimelineOperation, timelineMigrationConfig } from "./timeline-migration";

type TimelineWriteContext = {
  axisId: string;
  tick: number;
  eraId?: string;
  segmentId?: string;
  markerId?: string;
  eventId?: string;
};

type DualWriteMode = "create" | "update";

type EmitDualWriteParams = {
  req: FastifyRequest;
  dbName: string | undefined;
  subjectType: TimelineSubjectType;
  subjectId: string;
  node: unknown;
  mode: DualWriteMode;
  payload?: unknown;
  action: string;
};

type DualWriteResult = {
  written: number;
  skipped: boolean;
  reason?: string;
};

const IGNORED_ROOT_KEYS = new Set(["id", "createdAt", "updatedAt"]);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

const readHeader = (req: FastifyRequest, name: string): string | undefined => {
  const raw = req.headers[name];
  if (Array.isArray(raw)) {
    return raw[0];
  }
  if (typeof raw !== "string") {
    return undefined;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readRequiredTick = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
};

const parseTimelineWriteContext = (
  req: FastifyRequest
): TimelineWriteContext | undefined => {
  const axisId = readHeader(req, "x-timeline-axis-id");
  const tick = readRequiredTick(readHeader(req, "x-timeline-tick"));
  if (!axisId || tick === undefined) {
    return undefined;
  }
  const context: TimelineWriteContext = {
    axisId,
    tick,
  };
  const eraId = readHeader(req, "x-timeline-era-id");
  const segmentId = readHeader(req, "x-timeline-segment-id");
  const markerId = readHeader(req, "x-timeline-marker-id");
  const eventId = readHeader(req, "x-timeline-event-id");
  if (eraId) {
    context.eraId = eraId;
  }
  if (segmentId) {
    context.segmentId = segmentId;
  }
  if (markerId) {
    context.markerId = markerId;
  }
  if (eventId) {
    context.eventId = eventId;
  }
  return context;
};

const toSerialized = (value: unknown): string => {
  try {
    const serialized = JSON.stringify(value);
    if (serialized !== undefined) {
      return serialized;
    }
  } catch {
    // no-op
  }
  return JSON.stringify(String(value));
};

const flattenObject = (
  value: unknown,
  prefix = "",
  root = true,
  output: Map<string, unknown> = new Map()
): Map<string, unknown> => {
  if (!isPlainObject(value)) {
    if (prefix.length > 0) {
      output.set(prefix, value);
    }
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    if (root && IGNORED_ROOT_KEYS.has(key)) {
      continue;
    }
    const path = prefix.length > 0 ? `${prefix}.${key}` : key;
    if (child === undefined) {
      continue;
    }
    if (isPlainObject(child)) {
      flattenObject(child, path, false, output);
      continue;
    }
    output.set(path, child);
  }

  return output;
};

const flattenPayloadPaths = (payload: unknown): Set<string> =>
  new Set(flattenObject(payload).keys());

const selectChangedFields = (
  flattenedNode: Map<string, unknown>,
  mode: DualWriteMode,
  payload: unknown
): Array<[string, unknown]> => {
  if (mode === "create") {
    return Array.from(flattenedNode.entries());
  }
  const payloadPaths = flattenPayloadPaths(payload);
  if (payloadPaths.size === 0) {
    return [];
  }
  const selected: Array<[string, unknown]> = [];
  for (const [fieldPath, value] of flattenedNode.entries()) {
    if (payloadPaths.has(fieldPath)) {
      selected.push([fieldPath, value]);
    }
  }
  return selected;
};

const logDualWriteResult = (
  req: FastifyRequest,
  dbName: string | undefined,
  action: string,
  result: DualWriteResult
): void => {
  auditTimelineOperation({
    action: `timeline-dual-write.${action}`,
    method: req.method,
    path: req.url,
    requestId: req.id,
    dbName,
    result: "success",
    statusCode: result.skipped ? 202 : 200,
    detail: result.skipped
      ? `skipped: ${result.reason ?? "unknown"}`
      : `written: ${result.written}`,
  });
};

export const emitDualWriteStateChanges = async (
  params: EmitDualWriteParams
): Promise<DualWriteResult> => {
  const { req, dbName, subjectType, subjectId, node, mode, payload, action } = params;

  if (!timelineMigrationConfig.isDualWriteEnabled()) {
    const result: DualWriteResult = {
      written: 0,
      skipped: true,
      reason: "dual-write-disabled",
    };
    logDualWriteResult(req, dbName, action, result);
    return result;
  }

  if (!dbName) {
    const result: DualWriteResult = {
      written: 0,
      skipped: true,
      reason: "missing-db-name",
    };
    logDualWriteResult(req, dbName, action, result);
    return result;
  }

  const context = parseTimelineWriteContext(req);
  if (!context) {
    const result: DualWriteResult = {
      written: 0,
      skipped: true,
      reason: "missing-timeline-context-headers",
    };
    logDualWriteResult(req, dbName, action, result);
    return result;
  }

  const flattenedNode = flattenObject(node);
  const fields = selectChangedFields(flattenedNode, mode, payload);
  if (fields.length === 0) {
    const result: DualWriteResult = {
      written: 0,
      skipped: true,
      reason: "no-trackable-fields",
    };
    logDualWriteResult(req, dbName, action, result);
    return result;
  }

  let written = 0;
  for (const [fieldPath, value] of fields) {
    try {
      await timelineStateChangeService.create(
        {
          axisId: context.axisId,
          eraId: context.eraId,
          segmentId: context.segmentId,
          markerId: context.markerId,
          eventId: context.eventId,
          subjectType,
          subjectId,
          fieldPath,
          changeType: "set",
          newValue: toSerialized(value),
          effectiveTick: context.tick,
          notes: "auto dual-write",
          tags: ["dual-write"],
        },
        dbName
      );
      written += 1;
    } catch {
      // Best-effort dual-write must not break primary write flow.
    }
  }

  const result: DualWriteResult = {
    written,
    skipped: false,
  };
  logDualWriteResult(req, dbName, action, result);
  return result;
};
