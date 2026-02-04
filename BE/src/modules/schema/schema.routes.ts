import { RouteConfig } from "../../routes";
import { schemaController } from "./schema.controller";

export const schemaRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/schemas/:entity",
    handler: schemaController.getSchemaByEntity,
    schema: {
      tags: ["Schema"],
      summary: "Get schema by entity",
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "object", additionalProperties: true },
          },
        },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "POST",
    path: "/schemas",
    handler: schemaController.createSchema,
    schema: {
      tags: ["Schema"],
      summary: "Create schema",
      body: {
        type: "object",
        required: ["entity", "fields"],
        properties: {
          id: { type: "string" },
          entity: { type: "string" },
          title: { type: "string" },
          fields: { type: "array", items: { type: "object" } },
        },
      },
      response: {
        201: {
          type: "object",
          properties: { data: { type: "object", additionalProperties: true } },
        },
      },
    },
  },
  {
    method: "PUT",
    path: "/schemas",
    handler: schemaController.upsertSchema,
    schema: {
      tags: ["Schema"],
      summary: "Upsert schema",
      body: {
        type: "object",
        required: ["entity", "fields"],
        properties: {
          id: { type: "string" },
          entity: { type: "string" },
          title: { type: "string" },
          fields: { type: "array", items: { type: "object" } },
        },
      },
      response: {
        200: {
          type: "object",
          properties: { data: { type: "object", additionalProperties: true } },
        },
      },
    },
  },
  {
    method: "DELETE",
    path: "/schemas/:entity",
    handler: schemaController.deleteSchema,
    schema: {
      tags: ["Schema"],
      summary: "Delete schema",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
