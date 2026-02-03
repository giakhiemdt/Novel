import { FastifyReply, FastifyRequest, HTTPMethods } from "fastify";
import { characterRoutes } from "../modules/character/character.routes";
import { overviewRoutes } from "../modules/overview/overview.routes";
import { projectRoutes } from "../modules/project/project.routes";
import { timelineRoutes } from "../modules/timeline/timeline.routes";
import { locationRoutes } from "../modules/location/location.routes";
import { factionRoutes } from "../modules/faction/faction.routes";
import { eventRoutes } from "../modules/event/event.routes";
import { arcRoutes } from "../modules/arc/arc.routes";
import { chapterRoutes } from "../modules/chapter/chapter.routes";
import { sceneRoutes } from "../modules/scene/scene.routes";
import { healthRoutes } from "./health.routes";

export type RouteConfig = {
  method: HTTPMethods;
  path: string;
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  schema?: {
    body?: Record<string, unknown>;
    response?: Record<string, unknown>;
    querystring?: Record<string, unknown>;
    tags?: string[];
    summary?: string;
    description?: string;
  };
};

export const routes: RouteConfig[] = [
  ...healthRoutes,
  ...overviewRoutes,
  ...projectRoutes,
  ...characterRoutes,
  ...timelineRoutes,
  ...locationRoutes,
  ...factionRoutes,
  ...eventRoutes,
  ...arcRoutes,
  ...chapterRoutes,
  ...sceneRoutes,
];
