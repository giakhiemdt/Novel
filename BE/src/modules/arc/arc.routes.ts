import { RouteConfig } from "../../routes";
import { arcController } from "./arc.controller";

export const arcRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/arcs",
    handler: arcController.getAllArcs,
    schema: {
      tags: ["Arc"],
      summary: "Get all arcs",
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
    path: "/arcs",
    handler: arcController.createArc,
    schema: {
      tags: ["Arc"],
      summary: "Create arc",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          order: { type: "number" },
          summary: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            data: { type: "object", additionalProperties: true },
          },
        },
        400: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "PUT",
    path: "/arcs/:id",
    handler: arcController.updateArc,
    schema: {
      tags: ["Arc"],
      summary: "Update arc",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          order: { type: "number" },
          summary: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      response: {
        200: {
          type: "object",
          properties: { data: { type: "object", additionalProperties: true } },
        },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "DELETE",
    path: "/arcs/:id",
    handler: arcController.deleteArc,
    schema: {
      tags: ["Arc"],
      summary: "Delete arc",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
