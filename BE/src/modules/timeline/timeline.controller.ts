import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { auditTimelineOperation } from "../../shared/utils/timeline-migration";
import { timelineService } from "./timeline.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const createTimeline = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const timeline = await timelineService.create(req.body, dbName);
    auditTimelineOperation({
      action: "timeline.create",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: timeline.id,
      result: "success",
      statusCode: 201,
    });
    reply.status(201).send({ data: timeline });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline.create",
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

const updateTimeline = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    const timeline = await timelineService.update(id, req.body, dbName);
    auditTimelineOperation({
      action: "timeline.update",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: id,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send({ data: timeline });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline.update",
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

const getAllTimelines = async (
  _req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(_req);
  try {
    const result = await timelineService.getAllWithQuery(dbName, _req.query);
    auditTimelineOperation({
      action: "timeline.list",
      method: _req.method,
      path: _req.url,
      requestId: _req.id,
      dbName,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline.list",
      method: _req.method,
      path: _req.url,
      requestId: _req.id,
      dbName,
      result: "error",
      statusCode: handled.statusCode,
      detail: handled.message,
    });
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const timelineController = {
  createTimeline,
  updateTimeline,
  getAllTimelines,
  linkTimeline: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const dbName = getDatabaseHeader(req);
    try {
      await timelineService.link(req.body, dbName);
      auditTimelineOperation({
        action: "timeline.link",
        method: req.method,
        path: req.url,
        requestId: req.id,
        dbName,
        result: "success",
        statusCode: 200,
      });
      reply.status(200).send({ message: "Timeline linked" });
    } catch (error) {
      const handled = handleError(error);
      auditTimelineOperation({
        action: "timeline.link",
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
  },
  unlinkTimeline: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const dbName = getDatabaseHeader(req);
    try {
      await timelineService.unlink(req.body, dbName);
      auditTimelineOperation({
        action: "timeline.unlink",
        method: req.method,
        path: req.url,
        requestId: req.id,
        dbName,
        result: "success",
        statusCode: 200,
      });
      reply.status(200).send({ message: "Timeline unlinked" });
    } catch (error) {
      const handled = handleError(error);
      auditTimelineOperation({
        action: "timeline.unlink",
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
  },
  relinkTimeline: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const dbName = getDatabaseHeader(req);
    try {
      await timelineService.relink(req.body, dbName);
      auditTimelineOperation({
        action: "timeline.relink",
        method: req.method,
        path: req.url,
        requestId: req.id,
        dbName,
        result: "success",
        statusCode: 200,
      });
      reply.status(200).send({ message: "Timeline relinked" });
    } catch (error) {
      const handled = handleError(error);
      auditTimelineOperation({
        action: "timeline.relink",
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
  },
  deleteTimeline: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    try {
      await timelineService.delete(id, dbName);
      auditTimelineOperation({
        action: "timeline.delete",
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
        action: "timeline.delete",
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
  },
};
