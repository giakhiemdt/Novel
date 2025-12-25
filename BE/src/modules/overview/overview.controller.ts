import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { overviewService } from "./overview.service";

const createOverview = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const overview = await overviewService.create(req.body);
    reply.status(201).send({ data: overview });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getOverview = async (
  _req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const overview = await overviewService.get();
    reply.status(200).send({ data: overview });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const updateOverview = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const overview = await overviewService.update(req.body);
    reply.status(200).send({ data: overview });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const overviewController = {
  createOverview,
  getOverview,
  updateOverview,
};
