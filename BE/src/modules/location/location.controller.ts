import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { locationService } from "./location.service";

const createLocation = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const location = await locationService.create(req.body);
    reply.status(201).send({ data: location });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const locationController = {
  createLocation,
};
