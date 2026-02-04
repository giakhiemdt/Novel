import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { schemaService } from "./schema.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const getSchemaByEntity = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { entity } = req.params as { entity: string };
    const schema = await schemaService.getByEntity(entity, dbName);
    if (!schema) {
      reply.status(404).send({ message: "schema not found" });
      return;
    }
    reply.status(200).send({ data: schema });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const createSchema = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const schema = await schemaService.create(req.body, dbName);
    reply.status(201).send({ data: schema });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const upsertSchema = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const schema = await schemaService.upsert(req.body, dbName);
    reply.status(200).send({ data: schema });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const deleteSchema = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { entity } = req.params as { entity: string };
    await schemaService.deleteByEntity(entity, dbName);
    reply.status(204).send();
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const schemaController = {
  getSchemaByEntity,
  createSchema,
  upsertSchema,
  deleteSchema,
};
