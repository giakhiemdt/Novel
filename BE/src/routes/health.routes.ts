import { RouteConfig } from "./index";

export const healthRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/health",
    handler: async (_request, reply) => {
      reply.status(200).send({ status: "ok" });
    },
    schema: {
      tags: ["Health"],
      summary: "Health check",
      response: {
        200: {
          type: "object",
          properties: { status: { type: "string" } },
        },
      },
    },
  },
];
