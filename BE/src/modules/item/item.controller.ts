import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { itemService } from "./item.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const createItem = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const item = await itemService.create(req.body, dbName);
    reply.status(201).send({ data: item });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const updateItem = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    const item = await itemService.update(id, req.body, dbName);
    reply.status(200).send({ data: item });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getAllItems = async (
  _req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(_req);
    const result = await itemService.getAll(dbName, _req.query);
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const deleteItem = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    await itemService.delete(id, dbName);
    reply.status(204).send();
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getItemsByEvent = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    const items = await itemService.getItemsByEvent(id, dbName);
    reply.status(200).send({ data: items });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getEventsByItem = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    const events = await itemService.getEventsByItem(id, dbName);
    reply.status(200).send({ data: events });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const linkItemEvent = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    const body = req.body as { eventId?: string };
    await itemService.linkEvent(id, body?.eventId, dbName);
    reply.status(200).send({ message: "Item linked to event" });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const unlinkItemEvent = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    await itemService.unlinkEvent(id, dbName);
    reply.status(200).send({ message: "Item unlinked from event" });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const itemController = {
  createItem,
  updateItem,
  getAllItems,
  linkItemEvent,
  unlinkItemEvent,
  getItemsByEvent,
  getEventsByItem,
  deleteItem,
};
