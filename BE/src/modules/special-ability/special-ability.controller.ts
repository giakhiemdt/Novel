import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { specialAbilityService } from "./special-ability.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const createSpecialAbility = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const ability = await specialAbilityService.create(req.body, dbName);
    reply.status(201).send({ data: ability });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const updateSpecialAbility = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    const ability = await specialAbilityService.update(id, req.body, dbName);
    reply.status(200).send({ data: ability });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getAllSpecialAbilities = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const result = await specialAbilityService.getAllWithQuery(dbName, req.query);
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const deleteSpecialAbility = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    await specialAbilityService.delete(id, dbName);
    reply.status(204).send();
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const specialAbilityController = {
  createSpecialAbility,
  updateSpecialAbility,
  getAllSpecialAbilities,
  deleteSpecialAbility,
};
