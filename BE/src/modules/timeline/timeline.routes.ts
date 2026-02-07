import { RouteConfig } from "../../routes";
import { timelineController } from "./timeline.controller";

export const timelineRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/timelines",
    handler: timelineController.getAllTimelines,
    schema: {
      tags: ["Timeline"],
      summary: "Get all timelines",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          tag: { type: "string" },
          code: { type: "string" },
          isOngoing: { type: "boolean" },
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
                code: { type: "string" },
                isOngoing: { type: "boolean" },
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
    path: "/timelines",
    handler: timelineController.createTimeline,
    schema: {
      tags: ["Timeline"],
      summary: "Create timeline",
      body: {
        type: "object",
        required: ["name", "durationYears"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          durationYears: { type: "number" },
          isOngoing: { type: "boolean" },
          summary: { type: "string" },
          description: { type: "string" },
          characteristics: { type: "array", items: { type: "string" } },
          dominantForces: { type: "array", items: { type: "string" } },
          technologyLevel: { type: "string" },
          powerEnvironment: { type: "string" },
          worldState: { type: "string" },
          majorChanges: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          previousId: { type: "string" },
          nextId: { type: "string" },
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
                durationYears: { type: "number" },
                isOngoing: { type: "boolean" },
                summary: { type: "string" },
                description: { type: "string" },
                characteristics: { type: "array", items: { type: "string" } },
                dominantForces: { type: "array", items: { type: "string" } },
                technologyLevel: { type: "string" },
                powerEnvironment: { type: "string" },
                worldState: { type: "string" },
                majorChanges: { type: "array", items: { type: "string" } },
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
        409: {
          type: "object",
          properties: { message: { type: "string" } },
        },
      },
    },
  },
  {
    method: "DELETE",
    path: "/timelines/:id",
    handler: timelineController.deleteTimeline,
    schema: {
      tags: ["Timeline"],
      summary: "Delete timeline",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "POST",
    path: "/timelines/link",
    handler: timelineController.linkTimeline,
    schema: {
      tags: ["Timeline"],
      summary: "Link timeline",
      body: {
        type: "object",
        required: ["currentId"],
        properties: {
          currentId: { type: "string" },
          previousId: { type: "string" },
          nextId: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: { message: { type: "string" } },
        },
        400: {
          type: "object",
          properties: { message: { type: "string" } },
        },
        404: {
          type: "object",
          properties: { message: { type: "string" } },
        },
        409: {
          type: "object",
          properties: { message: { type: "string" } },
        },
      },
    },
  },
  {
    method: "POST",
    path: "/timelines/unlink",
    handler: timelineController.unlinkTimeline,
    schema: {
      tags: ["Timeline"],
      summary: "Unlink timeline",
      body: {
        type: "object",
        required: ["currentId"],
        properties: {
          currentId: { type: "string" },
          previousId: { type: "string" },
          nextId: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: { message: { type: "string" } },
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
    method: "POST",
    path: "/timelines/relink",
    handler: timelineController.relinkTimeline,
    schema: {
      tags: ["Timeline"],
      summary: "Relink timeline",
      body: {
        type: "object",
        required: ["currentId"],
        properties: {
          currentId: { type: "string" },
          previousId: { type: "string" },
          nextId: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: { message: { type: "string" } },
        },
        400: {
          type: "object",
          properties: { message: { type: "string" } },
        },
        404: {
          type: "object",
          properties: { message: { type: "string" } },
        },
        409: {
          type: "object",
          properties: { message: { type: "string" } },
        },
      },
    },
  },
];
