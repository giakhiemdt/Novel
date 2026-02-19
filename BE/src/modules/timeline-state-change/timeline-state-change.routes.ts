import { RouteConfig } from "../../routes";
import { timelineStateChangeController } from "./timeline-state-change.controller";
import {
  TIMELINE_STATE_CHANGE_STATUSES,
  TIMELINE_SUBJECT_TYPES,
} from "./timeline-state-change.types";

const errorSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
};

export const timelineStateChangeRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/timeline-state-changes",
    handler: timelineStateChangeController.getAllStateChanges,
    schema: {
      tags: ["Timeline State Change"],
      summary: "Get timeline state changes",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          axisId: { type: "string" },
          eraId: { type: "string" },
          segmentId: { type: "string" },
          markerId: { type: "string" },
          eventId: { type: "string" },
          subjectType: { type: "string", enum: [...TIMELINE_SUBJECT_TYPES] },
          subjectId: { type: "string" },
          fieldPath: { type: "string" },
          status: {
            type: "string",
            enum: [...TIMELINE_STATE_CHANGE_STATUSES],
          },
          tickFrom: { type: "number" },
          tickTo: { type: "number" },
          limit: { type: "number" },
          offset: { type: "number" },
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
                axisId: { type: "string" },
                eraId: { type: "string" },
                segmentId: { type: "string" },
                markerId: { type: "string" },
                eventId: { type: "string" },
                subjectType: {
                  type: "string",
                  enum: [...TIMELINE_SUBJECT_TYPES],
                },
                subjectId: { type: "string" },
                fieldPath: { type: "string" },
                status: {
                  type: "string",
                  enum: [...TIMELINE_STATE_CHANGE_STATUSES],
                },
                tickFrom: { type: "number" },
                tickTo: { type: "number" },
                limit: { type: "number" },
                offset: { type: "number" },
                total: { type: "number" },
              },
            },
          },
        },
        400: errorSchema,
      },
    },
  },
  {
    method: "GET",
    path: "/timeline-state-changes/snapshot",
    handler: timelineStateChangeController.getStateSnapshot,
    schema: {
      tags: ["Timeline State Change"],
      summary: "Get timeline state snapshot at a tick",
      querystring: {
        type: "object",
        required: ["axisId", "tick"],
        properties: {
          axisId: { type: "string" },
          tick: { type: "number" },
          subjectType: { type: "string", enum: [...TIMELINE_SUBJECT_TYPES] },
          subjectId: { type: "string" },
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
                axisId: { type: "string" },
                tick: { type: "number" },
                subjectType: {
                  type: "string",
                  enum: [...TIMELINE_SUBJECT_TYPES],
                },
                subjectId: { type: "string" },
              },
            },
          },
        },
        400: errorSchema,
        404: errorSchema,
      },
    },
  },
  {
    method: "GET",
    path: "/timeline-state-changes/projection",
    handler: timelineStateChangeController.getStateProjection,
    schema: {
      tags: ["Timeline State Change"],
      summary: "Get projected entity state at a tick",
      querystring: {
        type: "object",
        required: ["axisId", "tick"],
        properties: {
          axisId: { type: "string" },
          tick: { type: "number" },
          subjectType: { type: "string", enum: [...TIMELINE_SUBJECT_TYPES] },
          subjectId: { type: "string" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  subjectType: {
                    type: "string",
                    enum: [...TIMELINE_SUBJECT_TYPES],
                  },
                  subjectId: { type: "string" },
                  state: { type: "object", additionalProperties: true },
                  fields: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        stateChangeId: { type: "string" },
                        fieldPath: { type: "string" },
                        value: {},
                        rawValue: { type: "string" },
                        changeType: { type: "string" },
                        effectiveTick: { type: "number" },
                        markerId: { type: "string" },
                        eventId: { type: "string" },
                        updatedAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
            meta: {
              type: "object",
              properties: {
                axisId: { type: "string" },
                tick: { type: "number" },
                subjectType: {
                  type: "string",
                  enum: [...TIMELINE_SUBJECT_TYPES],
                },
                subjectId: { type: "string" },
                subjectCount: { type: "number" },
                fieldCount: { type: "number" },
              },
            },
          },
        },
        400: errorSchema,
        404: errorSchema,
      },
    },
  },
  {
    method: "GET",
    path: "/timeline-state-changes/history",
    handler: timelineStateChangeController.getStateHistory,
    schema: {
      tags: ["Timeline State Change"],
      summary: "Get state change replay history for one subject",
      querystring: {
        type: "object",
        required: ["axisId", "subjectType", "subjectId"],
        properties: {
          axisId: { type: "string" },
          subjectType: { type: "string", enum: [...TIMELINE_SUBJECT_TYPES] },
          subjectId: { type: "string" },
          fieldPath: { type: "string" },
          status: {
            type: "string",
            enum: [...TIMELINE_STATE_CHANGE_STATUSES],
          },
          tickFrom: { type: "number" },
          tickTo: { type: "number" },
          limit: { type: "number" },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  stateChangeId: { type: "string" },
                  effectiveTick: { type: "number" },
                  fieldPath: { type: "string" },
                  changeType: { type: "string" },
                  oldValue: {},
                  newValue: {},
                  markerId: { type: "string" },
                  eventId: { type: "string" },
                  updatedAt: { type: "string", format: "date-time" },
                  stateAfter: { type: "object", additionalProperties: true },
                },
              },
            },
            meta: {
              type: "object",
              properties: {
                axisId: { type: "string" },
                subjectType: { type: "string", enum: [...TIMELINE_SUBJECT_TYPES] },
                subjectId: { type: "string" },
                fieldPath: { type: "string" },
                status: {
                  type: "string",
                  enum: [...TIMELINE_STATE_CHANGE_STATUSES],
                },
                tickFrom: { type: "number" },
                tickTo: { type: "number" },
                limit: { type: "number" },
                total: { type: "number" },
                hasMore: { type: "boolean" },
                finalState: { type: "object", additionalProperties: true },
              },
            },
          },
        },
        400: errorSchema,
        404: errorSchema,
      },
    },
  },
  {
    method: "POST",
    path: "/timeline-state-changes",
    handler: timelineStateChangeController.createStateChange,
    schema: {
      tags: ["Timeline State Change"],
      summary: "Create timeline state change",
      body: {
        type: "object",
        required: ["axisId", "subjectType", "subjectId", "fieldPath", "effectiveTick"],
        properties: {
          id: { type: "string" },
          axisId: { type: "string" },
          eraId: { type: "string" },
          segmentId: { type: "string" },
          markerId: { type: "string" },
          eventId: { type: "string" },
          subjectType: { type: "string", enum: [...TIMELINE_SUBJECT_TYPES] },
          subjectId: { type: "string" },
          fieldPath: { type: "string" },
          changeType: { type: "string" },
          oldValue: { type: "string" },
          newValue: { type: "string" },
          effectiveTick: { type: "number" },
          detail: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          status: {
            type: "string",
            enum: [...TIMELINE_STATE_CHANGE_STATUSES],
          },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            data: { type: "object", additionalProperties: true },
          },
        },
        400: errorSchema,
        404: errorSchema,
        409: errorSchema,
      },
    },
  },
  {
    method: "PUT",
    path: "/timeline-state-changes/:id",
    handler: timelineStateChangeController.updateStateChange,
    schema: {
      tags: ["Timeline State Change"],
      summary: "Update timeline state change",
      body: {
        type: "object",
        required: ["axisId", "subjectType", "subjectId", "fieldPath", "effectiveTick"],
        properties: {
          axisId: { type: "string" },
          eraId: { type: "string" },
          segmentId: { type: "string" },
          markerId: { type: "string" },
          eventId: { type: "string" },
          subjectType: { type: "string", enum: [...TIMELINE_SUBJECT_TYPES] },
          subjectId: { type: "string" },
          fieldPath: { type: "string" },
          changeType: { type: "string" },
          oldValue: { type: "string" },
          newValue: { type: "string" },
          effectiveTick: { type: "number" },
          detail: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          status: {
            type: "string",
            enum: [...TIMELINE_STATE_CHANGE_STATUSES],
          },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            data: { type: "object", additionalProperties: true },
          },
        },
        400: errorSchema,
        404: errorSchema,
        409: errorSchema,
      },
    },
  },
  {
    method: "DELETE",
    path: "/timeline-state-changes/:id",
    handler: timelineStateChangeController.deleteStateChange,
    schema: {
      tags: ["Timeline State Change"],
      summary: "Delete timeline state change",
      response: {
        204: { type: "null" },
        404: errorSchema,
      },
    },
  },
];
