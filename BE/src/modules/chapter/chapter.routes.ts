import { RouteConfig } from "../../routes";
import { chapterController } from "./chapter.controller";

export const chapterRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/chapters",
    handler: chapterController.getAllChapters,
    schema: {
      tags: ["Chapter"],
      summary: "Get all chapters",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          tag: { type: "string" },
          arcId: { type: "string" },
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
                arcId: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  {
    method: "POST",
    path: "/chapters",
    handler: chapterController.createChapter,
    schema: {
      tags: ["Chapter"],
      summary: "Create chapter",
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
          arcId: { type: "string" },
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
    path: "/chapters/:id",
    handler: chapterController.updateChapter,
    schema: {
      tags: ["Chapter"],
      summary: "Update chapter",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          order: { type: "number" },
          summary: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          arcId: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { data: { type: "object" } } },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "DELETE",
    path: "/chapters/:id",
    handler: chapterController.deleteChapter,
    schema: {
      tags: ["Chapter"],
      summary: "Delete chapter",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
