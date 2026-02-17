import { RouteConfig } from "../../routes";
import { worldRuleController } from "./worldrule.controller";

export const worldRuleRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/world-rules",
    handler: worldRuleController.getAllRules,
    schema: {
      tags: ["WorldRule"],
      summary: "Get all world rules",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          limit: { type: "number" },
          offset: { type: "number" },
          title: { type: "string" },
          category: { type: "string" },
          status: { type: "string", enum: ["draft", "active", "deprecated"] },
          scope: { type: "string" },
          tag: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object", additionalProperties: true } },
            meta: {
              type: "object",
              properties: {
                q: { type: "string" },
                limit: { type: "number" },
                offset: { type: "number" },
                title: { type: "string" },
                category: { type: "string" },
                status: { type: "string" },
                scope: { type: "string" },
                tag: { type: "string" },
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
    path: "/world-rules",
    handler: worldRuleController.createRule,
    schema: {
      tags: ["WorldRule"],
      summary: "Create world rule",
      body: {
        type: "object",
        required: ["title"],
        properties: {
          id: { type: "string" },
          ruleCode: { type: "string" },
          title: { type: "string" },
          tldr: { type: "string" },
          category: { type: "string" },
          description: { type: "string" },
          scope: {
            anyOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
          timelineIds: { type: "array", items: { type: "string" } },
          triggerConditions: { type: "array", items: { type: "string" } },
          coreRules: { type: "array", items: { type: "string" } },
          consequences: { type: "array", items: { type: "string" } },
          examples: { type: "array", items: { type: "string" } },
          relatedRuleCodes: { type: "array", items: { type: "string" } },
          constraints: { type: "string" },
          exceptions: { type: "string" },
          status: { type: "string", enum: ["draft", "active", "deprecated"] },
          version: { type: "string" },
          validFrom: { type: "number" },
          validTo: { type: "number" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      response: {
        201: { type: "object", properties: { data: { type: "object" } } },
        400: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
  {
    method: "PUT",
    path: "/world-rules/:id",
    handler: worldRuleController.updateRule,
    schema: {
      tags: ["WorldRule"],
      summary: "Update world rule",
      body: {
        type: "object",
        required: ["title"],
        properties: {
          ruleCode: { type: "string" },
          title: { type: "string" },
          tldr: { type: "string" },
          category: { type: "string" },
          description: { type: "string" },
          scope: {
            anyOf: [
              { type: "string" },
              { type: "array", items: { type: "string" } },
            ],
          },
          timelineIds: { type: "array", items: { type: "string" } },
          triggerConditions: { type: "array", items: { type: "string" } },
          coreRules: { type: "array", items: { type: "string" } },
          consequences: { type: "array", items: { type: "string" } },
          examples: { type: "array", items: { type: "string" } },
          relatedRuleCodes: { type: "array", items: { type: "string" } },
          constraints: { type: "string" },
          exceptions: { type: "string" },
          status: { type: "string", enum: ["draft", "active", "deprecated"] },
          version: { type: "string" },
          validFrom: { type: "number" },
          validTo: { type: "number" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
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
    path: "/world-rules/:id",
    handler: worldRuleController.deleteRule,
    schema: {
      tags: ["WorldRule"],
      summary: "Delete world rule",
      response: {
        204: { type: "null" },
        404: { type: "object", properties: { message: { type: "string" } } },
      },
    },
  },
];
