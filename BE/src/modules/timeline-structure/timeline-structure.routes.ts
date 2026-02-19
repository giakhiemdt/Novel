import { RouteConfig } from "../../routes";
import { timelineStructureController } from "./timeline-structure.controller";

const statusEnum = ["active", "archived"];
const axisTypeEnum = ["main", "parallel", "branch", "loop"];

const errorSchema = {
  type: "object",
  properties: {
    message: { type: "string" },
  },
};

export const timelineStructureRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/timeline-axes",
    handler: timelineStructureController.getAxes,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Get timeline axes",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          axisType: { type: "string", enum: axisTypeEnum },
          status: { type: "string", enum: statusEnum },
          parentAxisId: { type: "string" },
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
                name: { type: "string" },
                code: { type: "string" },
                axisType: { type: "string", enum: axisTypeEnum },
                status: { type: "string", enum: statusEnum },
                parentAxisId: { type: "string" },
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
    method: "POST",
    path: "/timeline-axes",
    handler: timelineStructureController.createAxis,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Create timeline axis",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          axisType: { type: "string", enum: axisTypeEnum },
          description: { type: "string" },
          parentAxisId: { type: "string" },
          policy: { type: "string" },
          sortOrder: { type: "number" },
          startTick: { type: "number" },
          endTick: { type: "number" },
          status: { type: "string", enum: statusEnum },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
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
    path: "/timeline-axes/:id",
    handler: timelineStructureController.updateAxis,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Update timeline axis",
      body: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          code: { type: "string" },
          axisType: { type: "string", enum: axisTypeEnum },
          description: { type: "string" },
          parentAxisId: { type: "string" },
          policy: { type: "string" },
          sortOrder: { type: "number" },
          startTick: { type: "number" },
          endTick: { type: "number" },
          status: { type: "string", enum: statusEnum },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
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
    path: "/timeline-axes/:id",
    handler: timelineStructureController.deleteAxis,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Delete timeline axis",
      response: {
        204: { type: "null" },
        404: errorSchema,
      },
    },
  },
  {
    method: "GET",
    path: "/timeline-eras",
    handler: timelineStructureController.getEras,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Get timeline eras",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          axisId: { type: "string" },
          status: { type: "string", enum: statusEnum },
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
                name: { type: "string" },
                code: { type: "string" },
                axisId: { type: "string" },
                status: { type: "string", enum: statusEnum },
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
    method: "POST",
    path: "/timeline-eras",
    handler: timelineStructureController.createEra,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Create timeline era",
      body: {
        type: "object",
        required: ["axisId", "name"],
        properties: {
          id: { type: "string" },
          axisId: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          summary: { type: "string" },
          description: { type: "string" },
          order: { type: "number" },
          startTick: { type: "number" },
          endTick: { type: "number" },
          status: { type: "string", enum: statusEnum },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
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
    path: "/timeline-eras/:id",
    handler: timelineStructureController.updateEra,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Update timeline era",
      body: {
        type: "object",
        required: ["axisId", "name"],
        properties: {
          axisId: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          summary: { type: "string" },
          description: { type: "string" },
          order: { type: "number" },
          startTick: { type: "number" },
          endTick: { type: "number" },
          status: { type: "string", enum: statusEnum },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
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
    path: "/timeline-eras/:id",
    handler: timelineStructureController.deleteEra,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Delete timeline era",
      response: {
        204: { type: "null" },
        404: errorSchema,
      },
    },
  },
  {
    method: "GET",
    path: "/timeline-segments",
    handler: timelineStructureController.getSegments,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Get timeline segments",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          axisId: { type: "string" },
          eraId: { type: "string" },
          status: { type: "string", enum: statusEnum },
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
                name: { type: "string" },
                code: { type: "string" },
                axisId: { type: "string" },
                eraId: { type: "string" },
                status: { type: "string", enum: statusEnum },
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
    method: "POST",
    path: "/timeline-segments",
    handler: timelineStructureController.createSegment,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Create timeline segment",
      body: {
        type: "object",
        required: ["eraId", "name"],
        properties: {
          id: { type: "string" },
          eraId: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          summary: { type: "string" },
          description: { type: "string" },
          order: { type: "number" },
          startTick: { type: "number" },
          endTick: { type: "number" },
          status: { type: "string", enum: statusEnum },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
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
    path: "/timeline-segments/:id",
    handler: timelineStructureController.updateSegment,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Update timeline segment",
      body: {
        type: "object",
        required: ["eraId", "name"],
        properties: {
          eraId: { type: "string" },
          name: { type: "string" },
          code: { type: "string" },
          summary: { type: "string" },
          description: { type: "string" },
          order: { type: "number" },
          startTick: { type: "number" },
          endTick: { type: "number" },
          status: { type: "string", enum: statusEnum },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
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
    path: "/timeline-segments/:id",
    handler: timelineStructureController.deleteSegment,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Delete timeline segment",
      response: {
        204: { type: "null" },
        404: errorSchema,
      },
    },
  },
  {
    method: "GET",
    path: "/timeline-markers",
    handler: timelineStructureController.getMarkers,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Get timeline markers",
      querystring: {
        type: "object",
        properties: {
          q: { type: "string" },
          label: { type: "string" },
          markerType: { type: "string" },
          axisId: { type: "string" },
          eraId: { type: "string" },
          segmentId: { type: "string" },
          status: { type: "string", enum: statusEnum },
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
                label: { type: "string" },
                markerType: { type: "string" },
                axisId: { type: "string" },
                eraId: { type: "string" },
                segmentId: { type: "string" },
                status: { type: "string", enum: statusEnum },
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
    method: "POST",
    path: "/timeline-markers",
    handler: timelineStructureController.createMarker,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Create timeline marker",
      body: {
        type: "object",
        required: ["segmentId", "label", "tick"],
        properties: {
          id: { type: "string" },
          segmentId: { type: "string" },
          label: { type: "string" },
          tick: { type: "number" },
          markerType: { type: "string" },
          description: { type: "string" },
          eventRefId: { type: "string" },
          status: { type: "string", enum: statusEnum },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
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
    path: "/timeline-markers/:id",
    handler: timelineStructureController.updateMarker,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Update timeline marker",
      body: {
        type: "object",
        required: ["segmentId", "label", "tick"],
        properties: {
          segmentId: { type: "string" },
          label: { type: "string" },
          tick: { type: "number" },
          markerType: { type: "string" },
          description: { type: "string" },
          eventRefId: { type: "string" },
          status: { type: "string", enum: statusEnum },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
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
    path: "/timeline-markers/:id",
    handler: timelineStructureController.deleteMarker,
    schema: {
      tags: ["Timeline Structure"],
      summary: "Delete timeline marker",
      response: {
        204: { type: "null" },
        404: errorSchema,
      },
    },
  },
];
