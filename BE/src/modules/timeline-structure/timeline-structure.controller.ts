import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { auditTimelineOperation } from "../../shared/utils/timeline-migration";
import { timelineStructureService } from "./timeline-structure.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const createAxis = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const axis = await timelineStructureService.createAxis(req.body, dbName);
    auditTimelineOperation({
      action: "timeline-structure.axis.create",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: axis.id,
      result: "success",
      statusCode: 201,
    });
    reply.status(201).send({ data: axis });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-structure.axis.create",
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

const updateAxis = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    const axis = await timelineStructureService.updateAxis(id, req.body, dbName);
    auditTimelineOperation({
      action: "timeline-structure.axis.update",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: id,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send({ data: axis });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-structure.axis.update",
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

const getAxes = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const result = await timelineStructureService.getAxes(dbName, req.query);
    auditTimelineOperation({
      action: "timeline-structure.axis.list",
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
      action: "timeline-structure.axis.list",
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

const deleteAxis = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    await timelineStructureService.deleteAxis(id, dbName);
    auditTimelineOperation({
      action: "timeline-structure.axis.delete",
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
      action: "timeline-structure.axis.delete",
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

const createEra = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const era = await timelineStructureService.createEra(req.body, dbName);
    auditTimelineOperation({
      action: "timeline-structure.era.create",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: era.id,
      result: "success",
      statusCode: 201,
    });
    reply.status(201).send({ data: era });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-structure.era.create",
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

const updateEra = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    const era = await timelineStructureService.updateEra(id, req.body, dbName);
    auditTimelineOperation({
      action: "timeline-structure.era.update",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: id,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send({ data: era });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-structure.era.update",
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

const getEras = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const result = await timelineStructureService.getEras(dbName, req.query);
    auditTimelineOperation({
      action: "timeline-structure.era.list",
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
      action: "timeline-structure.era.list",
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

const deleteEra = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    await timelineStructureService.deleteEra(id, dbName);
    auditTimelineOperation({
      action: "timeline-structure.era.delete",
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
      action: "timeline-structure.era.delete",
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

const createSegment = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const segment = await timelineStructureService.createSegment(req.body, dbName);
    auditTimelineOperation({
      action: "timeline-structure.segment.create",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: segment.id,
      result: "success",
      statusCode: 201,
    });
    reply.status(201).send({ data: segment });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-structure.segment.create",
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

const updateSegment = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    const segment = await timelineStructureService.updateSegment(id, req.body, dbName);
    auditTimelineOperation({
      action: "timeline-structure.segment.update",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: id,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send({ data: segment });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-structure.segment.update",
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

const getSegments = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const result = await timelineStructureService.getSegments(dbName, req.query);
    auditTimelineOperation({
      action: "timeline-structure.segment.list",
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
      action: "timeline-structure.segment.list",
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

const deleteSegment = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    await timelineStructureService.deleteSegment(id, dbName);
    auditTimelineOperation({
      action: "timeline-structure.segment.delete",
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
      action: "timeline-structure.segment.delete",
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

const createMarker = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const marker = await timelineStructureService.createMarker(req.body, dbName);
    auditTimelineOperation({
      action: "timeline-structure.marker.create",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: marker.id,
      result: "success",
      statusCode: 201,
    });
    reply.status(201).send({ data: marker });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-structure.marker.create",
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

const updateMarker = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    const marker = await timelineStructureService.updateMarker(id, req.body, dbName);
    auditTimelineOperation({
      action: "timeline-structure.marker.update",
      method: req.method,
      path: req.url,
      requestId: req.id,
      dbName,
      resourceId: id,
      result: "success",
      statusCode: 200,
    });
    reply.status(200).send({ data: marker });
  } catch (error) {
    const handled = handleError(error);
    auditTimelineOperation({
      action: "timeline-structure.marker.update",
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

const getMarkers = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  try {
    const result = await timelineStructureService.getMarkers(dbName, req.query);
    auditTimelineOperation({
      action: "timeline-structure.marker.list",
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
      action: "timeline-structure.marker.list",
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

const deleteMarker = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const dbName = getDatabaseHeader(req);
  const { id } = req.params as { id: string };
  try {
    await timelineStructureService.deleteMarker(id, dbName);
    auditTimelineOperation({
      action: "timeline-structure.marker.delete",
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
      action: "timeline-structure.marker.delete",
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

export const timelineStructureController = {
  createAxis,
  updateAxis,
  getAxes,
  deleteAxis,
  createEra,
  updateEra,
  getEras,
  deleteEra,
  createSegment,
  updateSegment,
  getSegments,
  deleteSegment,
  createMarker,
  updateMarker,
  getMarkers,
  deleteMarker,
};
