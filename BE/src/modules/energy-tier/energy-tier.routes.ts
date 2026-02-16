import { RouteConfig } from "../../routes";
import { energyTierController } from "./energy-tier.controller";

export const energyTierRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/energy-tiers",
    handler: energyTierController.getEnergyTiers,
    schema: {
      tags: ["EnergyTier"],
      summary: "Get energy tiers",
      querystring: {
        type: "object",
        properties: {
          activeOnly: { type: "boolean" },
          energyTypeId: { type: "string" },
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
    path: "/energy-tiers",
    handler: energyTierController.createEnergyTier,
    schema: {
      tags: ["EnergyTier"],
      summary: "Create energy tier",
      body: {
        type: "object",
        required: ["energyTypeId", "code", "name"],
        properties: {
          id: { type: "string" },
          energyTypeId: { type: "string" },
          code: { type: "string" },
          name: { type: "string" },
          level: { type: "number" },
          description: { type: "string" },
          color: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      response: {
        201: { type: "object", properties: { data: { type: "object" } } },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
        409: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "PUT",
    path: "/energy-tiers/:id",
    handler: energyTierController.updateEnergyTier,
    schema: {
      tags: ["EnergyTier"],
      summary: "Update energy tier",
      body: {
        type: "object",
        required: ["energyTypeId", "code", "name"],
        properties: {
          energyTypeId: { type: "string" },
          code: { type: "string" },
          name: { type: "string" },
          level: { type: "number" },
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
    path: "/energy-tiers/:id",
    handler: energyTierController.deleteEnergyTier,
    schema: {
      tags: ["EnergyTier"],
      summary: "Delete energy tier",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "POST",
    path: "/energy-tiers/link",
    handler: energyTierController.linkEnergyTier,
    schema: {
      tags: ["EnergyTier"],
      summary: "Link energy tier progression",
      body: {
        type: "object",
        required: ["currentId", "previousId"],
        properties: {
          currentId: { type: "string" },
          previousId: { type: "string" },
          requiredAmount: { type: "number" },
          efficiency: { type: "number" },
          condition: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { data: { type: "object" } } },
      },
    },
  },
  {
    method: "POST",
    path: "/energy-tiers/unlink",
    handler: energyTierController.unlinkEnergyTier,
    schema: {
      tags: ["EnergyTier"],
      summary: "Unlink energy tier progression",
      body: {
        type: "object",
        required: ["currentId", "previousId"],
        properties: {
          currentId: { type: "string" },
          previousId: { type: "string" },
        },
      },
      response: {
        200: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
