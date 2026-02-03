import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { timelineService } from "./timeline.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const createTimeline = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const timeline = await timelineService.create(req.body, dbName);
    reply.status(201).send({ data: timeline });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getAllTimelines = async (
  _req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(_req);
    const result = await timelineService.getAllWithQuery(dbName, _req.query);
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const timelineController = {
  createTimeline,
  getAllTimelines,
  linkTimeline: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const dbName = getDatabaseHeader(req);
      await timelineService.link(req.body, dbName);
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
      const dbName = getDatabaseHeader(req);
      await timelineService.unlink(req.body, dbName);
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
      const dbName = getDatabaseHeader(req);
      await timelineService.relink(req.body, dbName);
      reply.status(200).send({ message: "Timeline relinked" });
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
  deleteTimeline: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const dbName = getDatabaseHeader(req);
      const { id } = req.params as { id: string };
      await timelineService.delete(id, dbName);
      reply.status(204).send();
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
};
