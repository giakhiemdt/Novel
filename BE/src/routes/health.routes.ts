import { appConfig } from "../config/app.config";
import { RouteConfig } from "./index";

export const healthRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/health",
    handler: async (_request, reply) => {
      reply.status(200).send({
        status: "ok",
        timelineModes: {
          read: appConfig.flags.timelineReadMode,
          write: appConfig.flags.timelineWriteMode,
          audit: appConfig.flags.timelineAuditEnabled,
        },
      });
    },
    schema: {
      tags: ["Health"],
      summary: "Health check",
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            timelineModes: {
              type: "object",
              properties: {
                read: { type: "string" },
                write: { type: "string" },
                audit: { type: "boolean" },
              },
            },
          },
        },
      },
    },
  },
];
