import { RouteConfig } from "../../routes";
import { overviewController } from "./overview.controller";

export const overviewRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/overview",
    handler: overviewController.getOverview,
    schema: {
      tags: ["Overview"],
      summary: "Get overview",
      response: {
        200: {
          type: "object",
          properties: {
            data: {
              type: ["object", "null"],
              additionalProperties: true,
            },
          },
        },
      },
    },
  },
  {
    method: "POST",
    path: "/overview",
    handler: overviewController.createOverview,
    schema: {
      tags: ["Overview"],
      summary: "Create overview",
      body: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          genre: { type: "array", items: { type: "string" } },
          shortSummary: { type: "string" },
          worldOverview: { type: "string" },
          technologyEra: { type: "string" },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            data: { type: "object", additionalProperties: true },
          },
        },
        400: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  },
  {
    method: "PUT",
    path: "/overview",
    handler: overviewController.updateOverview,
    schema: {
      tags: ["Overview"],
      summary: "Update overview",
      body: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          subtitle: { type: "string" },
          genre: { type: "array", items: { type: "string" } },
          shortSummary: { type: "string" },
          worldOverview: { type: "string" },
          technologyEra: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "object", additionalProperties: true },
          },
        },
        400: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        404: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  },
];
