import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { factionService } from "./faction.service";

const createFaction = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const faction = await factionService.create(req.body);
    reply.status(201).send({ data: faction });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const factionController = {
  createFaction,
};
