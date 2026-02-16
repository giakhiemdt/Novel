import { RouteConfig } from "../../routes";
import { energyTypeController } from "./energy-type.controller";

export const energyTypeRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/energy-types",
    handler: energyTypeController.getEnergyTypes,
    schema: {
      tags: ["EnergyType"],
      summary: "Get energy types",
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
    path: "/energy-types",
    handler: energyTypeController.createEnergyType,
    schema: {
      tags: ["EnergyType"],
      summary: "Create energy type",
      body: {
        type: "object",
        required: ["code", "name"],
        properties: {
          id: { type: "string" },
          code: { type: "string" },
          name: { type: "string" },
          levelCount: { type: "number" },
          levelRatios: { type: "array", items: { type: "number" } },
          description: { type: "string" },
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
    path: "/energy-types/:id",
    handler: energyTypeController.updateEnergyType,
    schema: {
      tags: ["EnergyType"],
      summary: "Update energy type",
      body: {
        type: "object",
        required: ["code", "name"],
        properties: {
          code: { type: "string" },
          name: { type: "string" },
          levelCount: { type: "number" },
          levelRatios: { type: "array", items: { type: "number" } },
          description: { type: "string" },
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
    path: "/energy-types/:id",
    handler: energyTypeController.deleteEnergyType,
    schema: {
      tags: ["EnergyType"],
      summary: "Delete energy type",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "GET",
    path: "/energy-types/conversions",
    handler: energyTypeController.getConversions,
    schema: {
      tags: ["EnergyType"],
      summary: "Get energy type conversions",
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
    path: "/energy-types/conversions",
    handler: energyTypeController.createOrUpdateConversion,
    schema: {
      tags: ["EnergyType"],
      summary: "Create or update energy type conversion",
      body: {
        type: "object",
        required: ["fromId", "toId"],
        properties: {
          fromId: { type: "string" },
          toId: { type: "string" },
          ratio: { type: "number" },
          lossRate: { type: "number" },
          condition: { type: "string" },
          color: { type: "string" },
          isActive: { type: "boolean" },
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
    path: "/energy-types/conversions/:fromId/:toId",
    handler: energyTypeController.deleteConversion,
    schema: {
      tags: ["EnergyType"],
      summary: "Delete energy type conversion",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
