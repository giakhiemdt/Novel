import { FastifyReply, FastifyRequest } from "fastify";
import { handleError } from "../../shared/errors/error-handler";
import { projectService } from "./project.service";

const createProject = async (
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const project = await projectService.create(req.body);
    reply.status(201).send({ data: project });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

const getAllProjects = async (
  _req: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const projects = await projectService.getAll();
    reply.status(200).send({ data: projects });
  } catch (error) {
    const handled = handleError(error);
    reply.status(handled.statusCode).send({ message: handled.message });
  }
};

export const projectController = {
  createProject,
  getAllProjects,
};
