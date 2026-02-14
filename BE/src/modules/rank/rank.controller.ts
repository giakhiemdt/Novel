import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { rankService } from "./rank.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const createRank = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const rank = await rankService.create(req.body, dbName);
    reply.status(201).send({ data: rank });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const updateRank = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    const rank = await rankService.update(id, req.body, dbName);
    reply.status(200).send({ data: rank });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getAllRanks = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const result = await rankService.getAllWithQuery(dbName, req.query);
    reply.status(200).send(result);
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const deleteRank = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    await rankService.delete(id, dbName);
    reply.status(204).send();
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const rankController = {
  createRank,
  updateRank,
  getAllRanks,
  deleteRank,
  linkRank: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const dbName = getDatabaseHeader(req);
      const result = await rankService.link(dbName, req.body);
      reply.status(200).send(result);
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
  unlinkRank: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const dbName = getDatabaseHeader(req);
      const result = await rankService.unlink(dbName, req.body);
      reply.status(200).send(result);
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
  updateLinkConditions: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const dbName = getDatabaseHeader(req);
      const result = await rankService.updateLinkConditions(dbName, req.body);
      reply.status(200).send(result);
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
  getBoardLayout: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const dbName = getDatabaseHeader(req);
      const result = await rankService.getBoardLayout(dbName);
      reply.status(200).send({ data: result });
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
  saveBoardLayout: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const dbName = getDatabaseHeader(req);
      const result = await rankService.saveBoardLayout(dbName, req.body);
      reply.status(200).send({ data: result });
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
};
