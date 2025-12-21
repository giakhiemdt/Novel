import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { characterService } from "./character.service";

const createCharacter = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const character = await characterService.create(req.body);
    reply.status(201).send({ data: character });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const characterController = {
  createCharacter,
};
