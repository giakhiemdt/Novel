import { RouteConfig } from "../../routes";
import {
  traitArrayBodySchema,
  traitArrayResponseSchema,
} from "../../shared/constants/trait-schema";
import { itemController } from "./item.controller";
import { ITEM_OWNER_TYPES, ITEM_STATUSES } from "./item.types";

export const itemRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/items",
    handler: itemController.getAllItems,
    schema: {
      tags: ["Item"],
      summary: "Get all items",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          tag: { type: "string" },
          status: { type: "string", enum: [...ITEM_STATUSES] },
          ownerId: { type: "string" },
          ownerType: { type: "string", enum: [...ITEM_OWNER_TYPES] },
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
                status: { type: "string" },
                ownerId: { type: "string" },
                ownerType: { type: "string" },
                total: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
  {
    method: "GET",
    path: "/events/:id/items",
    handler: itemController.getItemsByEvent,
    schema: {
      tags: ["Item"],
      summary: "Get items by event",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          tag: { type: "string" },
          status: { type: "string", enum: [...ITEM_STATUSES] },
          ownerId: { type: "string" },
          ownerType: { type: "string", enum: [...ITEM_OWNER_TYPES] },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object", additionalProperties: true } },
            meta: { type: "object", additionalProperties: true },
          },
        },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "POST",
    path: "/items",
    handler: itemController.createItem,
    schema: {
      tags: ["Item"],
      summary: "Create item",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          origin: { type: "string" },
          ownerId: { type: "string" },
          ownerType: { type: "string", enum: [...ITEM_OWNER_TYPES] },
          status: { type: "string", enum: [...ITEM_STATUSES] },
          powerLevel: { type: "number" },
          powerDescription: { type: "string" },
          abilities: traitArrayBodySchema,
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
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
    method: "GET",
    path: "/items/:id/events",
    handler: itemController.getEventsByItem,
    schema: {
      tags: ["Item"],
      summary: "Get events by item",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          name: { type: "string" },
          tag: { type: "string" },
          type: { type: "string" },
          timelineId: { type: "string" },
          locationId: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object", additionalProperties: true } },
            meta: { type: "object", additionalProperties: true },
          },
        },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "PUT",
    path: "/items/:id",
    handler: itemController.updateItem,
    schema: {
      tags: ["Item"],
      summary: "Update item",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          origin: { type: "string" },
          ownerId: { type: "string" },
          ownerType: { type: "string", enum: [...ITEM_OWNER_TYPES] },
          status: { type: "string", enum: [...ITEM_STATUSES] },
          powerLevel: { type: "number" },
          powerDescription: { type: "string" },
          abilities: traitArrayBodySchema,
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
                abilities: traitArrayResponseSchema,
              },
              additionalProperties: true,
            },
          },
        },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "POST",
    path: "/items/:id/event",
    handler: itemController.linkItemEvent,
    schema: {
      tags: ["Item"],
      summary: "Link item to event",
      body: {
        type: "object",
        required: ["eventId"],
        properties: { eventId: { type: "string" } },
      },
      response: {
        200: { type: "object", properties: { message: { type: "string" } } },
        400: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "DELETE",
    path: "/items/:id/event",
    handler: itemController.unlinkItemEvent,
    schema: {
      tags: ["Item"],
      summary: "Unlink item from event",
      response: {
        200: { type: "object", properties: { message: { type: "string" } } },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "DELETE",
    path: "/items/:id",
    handler: itemController.deleteItem,
    schema: {
      tags: ["Item"],
      summary: "Delete item",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
