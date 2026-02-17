import { RouteConfig } from "../../routes";
import {
  traitArrayBodySchema,
  traitArrayResponseSchema,
} from "../../shared/constants/trait-schema";
import { raceController } from "./race.controller";

export const raceRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/races",
    handler: raceController.getAllRaces,
    schema: {
      tags: ["Race"],
      summary: "Get all races",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          tag: { type: "string" },
          origin: { type: "string" },
          culture: { type: "string" },
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
                origin: { type: "string" },
                culture: { type: "string" },
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
    path: "/races",
    handler: raceController.createRace,
    schema: {
      tags: ["Race"],
      summary: "Create race",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          alias: { type: "array", items: { type: "string" } },
          description: { type: "string" },
          origin: { type: "string" },
          traits: traitArrayBodySchema,
          culture: { type: "string" },
          lifespan: { type: "string" },
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
                alias: { type: "array", items: { type: "string" } },
                description: { type: "string" },
                origin: { type: "string" },
                traits: traitArrayResponseSchema,
                culture: { type: "string" },
                lifespan: { type: "string" },
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
    path: "/races/:id",
    handler: raceController.updateRace,
    schema: {
      tags: ["Race"],
      summary: "Update race",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          alias: { type: "array", items: { type: "string" } },
          description: { type: "string" },
          origin: { type: "string" },
          traits: traitArrayBodySchema,
          culture: { type: "string" },
          lifespan: { type: "string" },
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
                alias: { type: "array", items: { type: "string" } },
                description: { type: "string" },
                origin: { type: "string" },
                traits: traitArrayResponseSchema,
                culture: { type: "string" },
                lifespan: { type: "string" },
                notes: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
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
    path: "/races/:id",
    handler: raceController.deleteRace,
    schema: {
      tags: ["Race"],
      summary: "Delete race",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
