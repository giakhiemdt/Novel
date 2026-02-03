import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { characterService } from "./character.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const createCharacter = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const character = await characterService.create(req.body, dbName);
    reply.status(201).send({ data: character });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const updateCharacter = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    const character = await characterService.update(id, req.body, dbName);
    reply.status(200).send({ data: character });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getAllCharacters = async (
  _req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(_req);
    const result = await characterService.getAllWithQuery(dbName, _req.query);
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const deleteCharacter = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    await characterService.delete(id, dbName);
    reply.status(204).send();
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const characterController = {
  createCharacter,
  updateCharacter,
  getAllCharacters,
  deleteCharacter,
};
