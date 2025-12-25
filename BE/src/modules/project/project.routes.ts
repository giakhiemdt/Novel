import { RouteConfig } from "../../routes";
import { projectController } from "./project.controller";

export const projectRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/projects",
    handler: projectController.getAllProjects,
    schema: {
      tags: ["Project"],
      summary: "Get all projects",
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
    path: "/projects",
    handler: projectController.createProject,
    schema: {
      tags: ["Project"],
      summary: "Create project",
      body: {
        type: "object",
        required: ["name", "dbName"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" },
          dbName: { type: "string" },
          status: { type: "string", enum: ["active", "archived"] },
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
                description: { type: "string" },
                dbName: { type: "string" },
                status: { type: "string", enum: ["active", "archived"] },
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
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  },
];
