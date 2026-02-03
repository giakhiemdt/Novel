import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { locationService } from "./location.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const createLocation = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const location = await locationService.create(req.body, dbName);
    reply.status(201).send({ data: location });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const updateLocation = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    const location = await locationService.update(id, req.body, dbName);
    reply.status(200).send({ data: location });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getAllLocations = async (
  _req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(_req);
    const result = await locationService.getAllWithQuery(dbName, _req.query);
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const deleteLocation = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    await locationService.delete(id, dbName);
    reply.status(204).send();
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const createContains = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    await locationService.createContains(req.body, dbName);
    reply.status(200).send({ message: "Location linked" });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const deleteContains = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    await locationService.deleteContains(req.body, dbName);
    reply.status(200).send({ message: "Location unlinked" });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const locationController = {
  createLocation,
  updateLocation,
  getAllLocations,
  createContains,
  deleteContains,
  deleteLocation,
};
