import { RouteConfig } from "./index";

export const healthRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/health",
    handler: async (_request, reply) => {
      reply.status(200).send({ status: "ok" });
    },
  },
];
