import { FastifyReply, FastifyRequest, HTTPMethods } from "fastify";
import { characterRoutes } from "../modules/character/character.routes";
import { timelineRoutes } from "../modules/timeline/timeline.routes";
import { locationRoutes } from "../modules/location/location.routes";
import { factionRoutes } from "../modules/faction/faction.routes";
import { healthRoutes } from "./health.routes";

export type RouteConfig = {
  method: HTTPMethods;
  path: string;
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  schema?: {
    body?: Record<string, unknown>;
    response?: Record<string, unknown>;
    tags?: string[];
    summary?: string;
    description?: string;
  };
};

export const routes: RouteConfig[] = [
  ...healthRoutes,
  ...characterRoutes,
  ...timelineRoutes,
  ...locationRoutes,
  ...factionRoutes,
];
