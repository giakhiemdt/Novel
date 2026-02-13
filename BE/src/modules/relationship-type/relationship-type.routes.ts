import { RouteConfig } from "../../routes";
import { relationshipTypeController } from "./relationship-type.controller";

export const relationshipTypeRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/relationship-types",
    handler: relationshipTypeController.getRelationshipTypes,
    schema: {
      tags: ["RelationshipType"],
      summary: "Get relationship types",
      querystring: {
        type: "object",
        properties: {
          activeOnly: { type: "boolean" },
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
          },
        },
      },
    },
  },
  {
    method: "POST",
    path: "/relationship-types",
    handler: relationshipTypeController.createRelationshipType,
    schema: {
      tags: ["RelationshipType"],
      summary: "Create relationship type",
      body: {
        type: "object",
        required: ["code", "name"],
        properties: {
          id: { type: "string" },
          code: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          isDirectional: { type: "boolean" },
          color: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      response: {
        201: { type: "object", properties: { data: { type: "object" } } },
        400: { type: "object", properties: { message: { type: "string" } } },
        409: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "PUT",
    path: "/relationship-types/:id",
    handler: relationshipTypeController.updateRelationshipType,
    schema: {
      tags: ["RelationshipType"],
      summary: "Update relationship type",
      body: {
        type: "object",
        required: ["code", "name"],
        properties: {
          code: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          isDirectional: { type: "boolean" },
          color: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      response: {
        200: { type: "object", properties: { data: { type: "object" } } },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
        409: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "DELETE",
    path: "/relationship-types/:id",
    handler: relationshipTypeController.deleteRelationshipType,
    schema: {
      tags: ["RelationshipType"],
      summary: "Delete relationship type",
      querystring: {
        type: "object",
        properties: {
          force: { type: "boolean" },
        },
      },
      response: {
        204: { type: "null" },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
        409: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
