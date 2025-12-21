import fastify, { FastifyInstance } from "fastify";
import { appConfig } from "./config/app.config";
import { routes } from "./routes";

export type App = {
  server: FastifyInstance;
  start: () => Promise<void>;
};

export const createApp = (): App => {
  const server = fastify({ logger: true });

  routes.forEach((route) => {
    server.route({
      method: route.method,
      url: route.path,
      handler: route.handler,
    });
  });

  return {
    server,
    start: async () => {
      await server.listen({ port: appConfig.port, host: "0.0.0.0" });
    },
  };
};
