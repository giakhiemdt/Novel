import { RouteConfig } from "../../routes";
import { relationshipController } from "./relationship.controller";

export const relationshipRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/character-relations",
    handler: relationshipController.getRelations,
    schema: {
      tags: ["CharacterRelation"],
      summary: "Get character relations",
      querystring: {
        type: "object",
        properties: {
          characterId: { type: "string" },
          type: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object", additionalProperties: true } },
          },
        },
      },
    },
  },
  {
    method: "POST",
    path: "/character-relations",
    handler: relationshipController.createRelation,
    schema: {
      tags: ["CharacterRelation"],
      summary: "Create character relation",
      body: {
        type: "object",
        required: ["fromId", "toId", "type"],
        properties: {
          fromId: { type: "string" },
          toId: { type: "string" },
          type: { type: "string" },
          startYear: { type: "number" },
          endYear: { type: "number" },
          note: { type: "string" },
        },
      },
      response: {
        201: { type: "object", properties: { data: { type: "object" } } },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "PUT",
    path: "/character-relations",
    handler: relationshipController.updateRelation,
    schema: {
      tags: ["CharacterRelation"],
      summary: "Update character relation",
      body: {
        type: "object",
        required: ["fromId", "toId", "type"],
        properties: {
          fromId: { type: "string" },
          toId: { type: "string" },
          type: { type: "string" },
          startYear: { type: "number" },
          endYear: { type: "number" },
          note: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { message: { type: "string" } } },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "DELETE",
    path: "/character-relations",
    handler: relationshipController.deleteRelation,
    schema: {
      tags: ["CharacterRelation"],
      summary: "Delete character relation",
      body: {
        type: "object",
        required: ["fromId", "toId", "type"],
        properties: {
          fromId: { type: "string" },
          toId: { type: "string" },
          type: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { message: { type: "string" } } },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
