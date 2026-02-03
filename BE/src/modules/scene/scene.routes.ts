import { RouteConfig } from "../../routes";
import { sceneController } from "./scene.controller";

export const sceneRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/scenes",
    handler: sceneController.getAllScenes,
    schema: {
      tags: ["Scene"],
      summary: "Get all scenes",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          tag: { type: "string" },
          chapterId: { type: "string" },
          eventId: { type: "string" },
          locationId: { type: "string" },
          characterId: { type: "string" },
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
                chapterId: { type: "string" },
                eventId: { type: "string" },
                locationId: { type: "string" },
                characterId: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  {
    method: "POST",
    path: "/scenes",
    handler: sceneController.createScene,
    schema: {
      tags: ["Scene"],
      summary: "Create scene",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          order: { type: "number" },
          summary: { type: "string" },
          content: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          chapterId: { type: "string" },
          eventId: { type: "string" },
          locationId: { type: "string" },
          characterIds: { type: "array", items: { type: "string" } },
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
    path: "/scenes/:id",
    handler: sceneController.updateScene,
    schema: {
      tags: ["Scene"],
      summary: "Update scene",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          order: { type: "number" },
          summary: { type: "string" },
          content: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          chapterId: { type: "string" },
          eventId: { type: "string" },
          locationId: { type: "string" },
          characterIds: { type: "array", items: { type: "string" } },
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
    path: "/scenes/:id",
    handler: sceneController.deleteScene,
    schema: {
      tags: ["Scene"],
      summary: "Delete scene",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
