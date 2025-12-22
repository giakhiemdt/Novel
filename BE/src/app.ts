import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { appConfig } from "./config/app.config";
import { routes } from "./routes";

export type App = {
  server: FastifyInstance;
  start: () => Promise<void>;
};

export const createApp = (): App => {
  const server = fastify({ logger: true });

  server.register(cors, {
    origin: true,
  });

  server.register(swagger, {
    mode: "dynamic",
    swagger: {
      info: {
        title: "Novel API",
        description: "API documentation for Novel",
        version: "1.0.0",
      },
    },
  });

  server.register(swaggerUi, {
    routePrefix: "/docs",
  });

  server.register(async (instance) => {
    routes.forEach((route) => {
      const routeOptions = {
        method: route.method,
        url: route.path,
        handler: route.handler,
        ...(route.schema ? { schema: route.schema } : {}),
      };
      instance.route(routeOptions);
    });
  });

  return {
    server,
    start: async () => {
      await server.listen({ port: appConfig.port, host: "0.0.0.0" });
    },
  };
};
