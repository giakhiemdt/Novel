import { RouteConfig } from "../../routes";
import { mapSystemController } from "./map-system.controller";

export const mapSystemRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/map-systems",
    handler: mapSystemController.getAllMapSystems,
    schema: {
      tags: ["MapSystem"],
      summary: "Get all map systems",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          code: { type: "string" },
          scope: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { type: "object", additionalProperties: true },
            },
            meta: {
              type: "object",
              properties: {
                q: { type: "string" },
                limit: { type: "number" },
                offset: { type: "number" },
                name: { type: "string" },
                code: { type: "string" },
                scope: { type: "string" },
                total: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
  {
    method: "POST",
    path: "/map-systems",
    handler: mapSystemController.createMapSystem,
    schema: {
      tags: ["MapSystem"],
      summary: "Create map system",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          description: { type: "string" },
          scope: { type: "string" },
          seed: { type: "string" },
          width: { type: "number" },
          height: { type: "number" },
          seaLevel: { type: "number" },
          climatePreset: { type: "string" },
          config: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                code: { type: "string" },
                description: { type: "string" },
                scope: { type: "string" },
                seed: { type: "string" },
                width: { type: "number" },
                height: { type: "number" },
                seaLevel: { type: "number" },
                climatePreset: { type: "string" },
                config: { type: "string" },
                notes: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
        400: {
          type: "object",
          properties: { message: { type: "string" } },
        },
      },
    },
  },
  {
    method: "PUT",
    path: "/map-systems/:id",
    handler: mapSystemController.updateMapSystem,
    schema: {
      tags: ["MapSystem"],
      summary: "Update map system",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          description: { type: "string" },
          scope: { type: "string" },
          seed: { type: "string" },
          width: { type: "number" },
          height: { type: "number" },
          seaLevel: { type: "number" },
          climatePreset: { type: "string" },
          config: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                code: { type: "string" },
                description: { type: "string" },
                scope: { type: "string" },
                seed: { type: "string" },
                width: { type: "number" },
                height: { type: "number" },
                seaLevel: { type: "number" },
                climatePreset: { type: "string" },
                config: { type: "string" },
                notes: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
        400: {
          type: "object",
          properties: { message: { type: "string" } },
        },
        404: {
          type: "object",
          properties: { message: { type: "string" } },
        },
      },
    },
  },
  {
    method: "DELETE",
    path: "/map-systems/:id",
    handler: mapSystemController.deleteMapSystem,
    schema: {
      tags: ["MapSystem"],
      summary: "Delete map system",
      response: {
        204: { type: "null" },
        404: {
          type: "object",
          properties: { message: { type: "string" } },
        },
      },
    },
  },
];
