import { RouteConfig } from "../../routes";
import { specialAbilityController } from "./special-ability.controller";

export const specialAbilityRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/special-abilities",
    handler: specialAbilityController.getAllSpecialAbilities,
    schema: {
      tags: ["Special Ability"],
      summary: "Get all special abilities",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          tag: { type: "string" },
          type: { type: "string", enum: ["innate", "acquired"] },
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
                type: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  {
    method: "POST",
    path: "/special-abilities",
    handler: specialAbilityController.createSpecialAbility,
    schema: {
      tags: ["Special Ability"],
      summary: "Create special ability",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          type: { type: "string", enum: ["innate", "acquired"] },
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
                type: { type: "string" },
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
    path: "/special-abilities/:id",
    handler: specialAbilityController.updateSpecialAbility,
    schema: {
      tags: ["Special Ability"],
      summary: "Update special ability",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          type: { type: "string", enum: ["innate", "acquired"] },
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
                type: { type: "string" },
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
    path: "/special-abilities/:id",
    handler: specialAbilityController.deleteSpecialAbility,
    schema: {
      tags: ["Special Ability"],
      summary: "Delete special ability",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
