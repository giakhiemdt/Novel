import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { energyTierService } from "./energy-tier.service";

const getDatabaseHeader = (req: FastifyRequest): string | undefined => {
  const header = req.headers["x-neo4j-database"];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header;
};

const getEnergyTiers = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const items = await energyTierService.getAll(dbName, req.query);
    reply.status(200).send({ data: items });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const createEnergyTier = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const item = await energyTierService.create(req.body, dbName);
    reply.status(201).send({ data: item });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const updateEnergyTier = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    const item = await energyTierService.update(id, req.body, dbName);
    reply.status(200).send({ data: item });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const deleteEnergyTier = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const dbName = getDatabaseHeader(req);
    const { id } = req.params as { id: string };
    await energyTierService.delete(id, dbName);
    reply.status(204).send();
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const energyTierController = {
  getEnergyTiers,
  createEnergyTier,
  updateEnergyTier,
  deleteEnergyTier,
  linkEnergyTier: async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      const dbName = getDatabaseHeader(req);
      const result = await energyTierService.link(req.body, dbName);
      reply.status(200).send(result);
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
  unlinkEnergyTier: async (
    req: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const dbName = getDatabaseHeader(req);
      const result = await energyTierService.unlink(req.body, dbName);
      reply.status(200).send(result);
    } catch (error) {
      const handled = handleError(error);
      reply.status(handled.statusCode).send({ message: handled.message });
    }
  },
};
