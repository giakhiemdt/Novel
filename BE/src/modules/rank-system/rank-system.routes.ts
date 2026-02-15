import { RouteConfig } from "../../routes";
import { rankSystemController } from "./rank-system.controller";

export const rankSystemRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/rank-systems",
    handler: rankSystemController.getAllRankSystems,
    schema: {
      tags: ["RankSystem"],
      summary: "Get all rank systems",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          domain: { type: "string" },
          energyType: { type: "string" },
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
                domain: { type: "string" },
                energyType: { type: "string" },
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
    path: "/rank-systems",
    handler: rankSystemController.createRankSystem,
    schema: {
      tags: ["RankSystem"],
      summary: "Create rank system",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          description: { type: "string" },
          domain: { type: "string" },
          energyType: { type: "string" },
          priority: { type: "number" },
          isPrimary: { type: "boolean" },
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
                domain: { type: "string" },
                energyType: { type: "string" },
                priority: { type: "number" },
                isPrimary: { type: "boolean" },
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
    method: "GET",
    path: "/rank-systems/:id/ranks",
    handler: rankSystemController.getRanksBySystem,
    schema: {
      tags: ["RankSystem"],
      summary: "Get ranks by rank system",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          tag: { type: "string" },
          tier: { type: "string" },
          system: { type: "string" },
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
                tag: { type: "string" },
                tier: { type: "string" },
                system: { type: "string" },
                systemId: { type: "string" },
                total: { type: "number" },
              },
            },
          },
        },
        404: {
          type: "object",
          properties: { message: { type: "string" } },
        },
      },
    },
  },
  {
    method: "PUT",
    path: "/rank-systems/:id",
    handler: rankSystemController.updateRankSystem,
    schema: {
      tags: ["RankSystem"],
      summary: "Update rank system",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          description: { type: "string" },
          domain: { type: "string" },
          energyType: { type: "string" },
          priority: { type: "number" },
          isPrimary: { type: "boolean" },
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
                domain: { type: "string" },
                energyType: { type: "string" },
                priority: { type: "number" },
                isPrimary: { type: "boolean" },
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
    path: "/rank-systems/:id",
    handler: rankSystemController.deleteRankSystem,
    schema: {
      tags: ["RankSystem"],
      summary: "Delete rank system",
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
