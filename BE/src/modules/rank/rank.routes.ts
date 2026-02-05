import { RouteConfig } from "../../routes";
import { rankController } from "./rank.controller";

export const rankRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/ranks",
    handler: rankController.getAllRanks,
    schema: {
      tags: ["Rank"],
      summary: "Get all ranks",
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
              },
            },
          },
        },
      },
    },
  },
  {
    method: "POST",
    path: "/ranks",
    handler: rankController.createRank,
    schema: {
      tags: ["Rank"],
      summary: "Create rank",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          alias: { type: "array", items: { type: "string" } },
          tier: { type: "string" },
          system: { type: "string" },
          description: { type: "string" },
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
                alias: { type: "array", items: { type: "string" } },
                tier: { type: "string" },
                system: { type: "string" },
                description: { type: "string" },
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
    path: "/ranks/:id",
    handler: rankController.updateRank,
    schema: {
      tags: ["Rank"],
      summary: "Update rank",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          alias: { type: "array", items: { type: "string" } },
          tier: { type: "string" },
          system: { type: "string" },
          description: { type: "string" },
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
                alias: { type: "array", items: { type: "string" } },
                tier: { type: "string" },
                system: { type: "string" },
                description: { type: "string" },
                notes: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string" },
              },
            },
          },
        },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "DELETE",
    path: "/ranks/:id",
    handler: rankController.deleteRank,
    schema: {
      tags: ["Rank"],
      summary: "Delete rank",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "POST",
    path: "/ranks/link",
    handler: rankController.linkRank,
    schema: {
      tags: ["Rank"],
      summary: "Link rank progression",
      body: {
        type: "object",
        required: ["currentId", "previousId"],
        properties: {
          currentId: { type: "string" },
          previousId: { type: "string" },
          conditions: { type: "array", items: { type: "string" } },
        },
      },
      response: {
        200: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "POST",
    path: "/ranks/unlink",
    handler: rankController.unlinkRank,
    schema: {
      tags: ["Rank"],
      summary: "Unlink rank progression",
      body: {
        type: "object",
        required: ["currentId", "previousId"],
        properties: {
          currentId: { type: "string" },
          previousId: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
