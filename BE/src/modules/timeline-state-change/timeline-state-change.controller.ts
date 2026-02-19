import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { auditTimelineOperation } from "../../shared/utils/timeline-migration";
import { timelineStateChangeService } from "./timeline-state-change.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const createStateChange = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const stateChange = await timelineStateChangeService.create(req.body, dbName);
    auditTimelineOperation({
      action: "timeline-state-change.create",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: stateChange.id,
      result: "success",
      statusCode: 201,
    });
    reply.status(201).send({ data: stateChange });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-state-change.create",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      result: "error",
      statusCode: handled.statusCode,
      detail: handled.message,
    });
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const updateStateChange = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    const stateChange = await timelineStateChangeService.update(id, req.body, dbName);
    auditTimelineOperation({
      action: "timeline-state-change.update",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: id,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send({ data: stateChange });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-state-change.update",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: id,
      result: "error",
      statusCode: handled.statusCode,
      detail: handled.message,
    });
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getAllStateChanges = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const result = await timelineStateChangeService.getAll(dbName, req.query);
    auditTimelineOperation({
      action: "timeline-state-change.list",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-state-change.list",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      result: "error",
      statusCode: handled.statusCode,
      detail: handled.message,
    });
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getStateSnapshot = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const result = await timelineStateChangeService.getSnapshot(dbName, req.query);
    auditTimelineOperation({
      action: "timeline-state-change.snapshot",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-state-change.snapshot",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      result: "error",
      statusCode: handled.statusCode,
      detail: handled.message,
    });
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getStateProjection = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const result = await timelineStateChangeService.getProjection(dbName, req.query);
    auditTimelineOperation({
      action: "timeline-state-change.projection",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-state-change.projection",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      result: "error",
      statusCode: handled.statusCode,
      detail: handled.message,
    });
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getStateHistory = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const result = await timelineStateChangeService.getHistory(dbName, req.query);
    auditTimelineOperation({
      action: "timeline-state-change.history",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-state-change.history",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      result: "error",
      statusCode: handled.statusCode,
      detail: handled.message,
    });
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const deleteStateChange = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    await timelineStateChangeService.delete(id, dbName);
    auditTimelineOperation({
      action: "timeline-state-change.delete",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: id,
      result: "success",
      statusCode: 204,
    });
    reply.status(204).send();
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-state-change.delete",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: id,
      result: "error",
      statusCode: handled.statusCode,
      detail: handled.message,
    });
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const timelineStateChangeController = {
  createStateChange,
  updateStateChange,
  getAllStateChanges,
  getStateSnapshot,
  getStateProjection,
  getStateHistory,
  deleteStateChange,
};
