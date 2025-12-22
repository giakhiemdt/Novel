import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { timelineService } from "./timeline.service";

const createTimeline = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const timeline = await timelineService.create(req.body);
    reply.status(201).send({ data: timeline });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const timelineController = {
  createTimeline,
  linkTimeline: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await timelineService.link(req.body);
      reply.status(200).send({ message: "Timeline linked" });
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
  unlinkTimeline: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await timelineService.unlink(req.body);
      reply.status(200).send({ message: "Timeline unlinked" });
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
  relinkTimeline: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      await timelineService.relink(req.body);
      reply.status(200).send({ message: "Timeline relinked" });
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
};
