import { RouteConfig } from "../../routes";
import { conflictController } from "./conflict.controller";

export const conflictRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/conflicts",
    handler: conflictController.getConflictReport,
    schema: {
      tags: ["Conflict"],
      summary: "Get conflict report",
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "object", additionalProperties: true },
          },
        },
      },
    },
  },
];
