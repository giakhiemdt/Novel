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
import { conflictRoutes } from "../modules/conflict/conflict.routes";
import { itemRoutes } from "../modules/item/item.routes";
import { relationshipRoutes } from "../modules/relationship/relationship.routes";
import { worldRuleRoutes } from "../modules/worldrule/worldrule.routes";
import { raceRoutes } from "../modules/race/race.routes";
import { rankRoutes } from "../modules/rank/rank.routes";
import { rankSystemRoutes } from "../modules/rank-system/rank-system.routes";
import { mapSystemRoutes } from "../modules/map-system/map-system.routes";
import { specialAbilityRoutes } from "../modules/special-ability/special-ability.routes";
import { schemaRoutes } from "../modules/schema/schema.routes";
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
  ...raceRoutes,
  ...rankSystemRoutes,
  ...rankRoutes,
  ...mapSystemRoutes,
  ...specialAbilityRoutes,
  ...schemaRoutes,
  ...timelineRoutes,
  ...locationRoutes,
  ...factionRoutes,
  ...eventRoutes,
  ...arcRoutes,
  ...chapterRoutes,
  ...sceneRoutes,
  ...conflictRoutes,
  ...itemRoutes,
  ...relationshipRoutes,
  ...worldRuleRoutes,
];
