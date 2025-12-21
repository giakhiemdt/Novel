import { FastifyReply, FastifyRequest, HTTPMethods } from "fastify";
import { characterRoutes } from "../modules/character/character.routes";
import { healthRoutes } from "./health.routes";

export type RouteConfig = {
  method: HTTPMethods;
  path: string;
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
};

export const routes: RouteConfig[] = [...healthRoutes, ...characterRoutes];
