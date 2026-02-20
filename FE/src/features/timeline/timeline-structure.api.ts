import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type { PagedResponse } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type {
  TimelineAxis,
  TimelineAxisPayload,
  TimelineEra,
  TimelineEraPayload,
  TimelineMarker,
  TimelineMarkerPayload,
  TimelineSegment,
  TimelineSegmentPayload,
  TimelineStateChange,
  TimelineStateDiffResult,
  TimelineStructListMeta,
} from "./timeline-structure.types";

export type TimelineAxisListQuery = {
  q?: string;
  name?: string;
  code?: string;
  axisType?: string;
  status?: string;
  parentAxisId?: string;
  limit?: number;
  offset?: number;
};

export type TimelineEraListQuery = {
  q?: string;
  name?: string;
  code?: string;
  axisId?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type TimelineSegmentListQuery = {
  q?: string;
  name?: string;
  code?: string;
  axisId?: string;
  eraId?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type TimelineMarkerListQuery = {
  q?: string;
  label?: string;
  markerType?: string;
  axisId?: string;
  eraId?: string;
  segmentId?: string;
  status?: string;
  tickFrom?: number;
  tickTo?: number;
  limit?: number;
  offset?: number;
};

export type TimelineStateSnapshotQuery = {
  axisId: string;
  tick: number;
  subjectType?: string;
  subjectId?: string;
};

export type TimelineStateDiffQuery = {
  axisId: string;
  subjectType: string;
  subjectId: string;
  fromTick: number;
  toTick: number;
};

export type TimelineStateHistoryQuery = {
  axisId: string;
  subjectType: string;
  subjectId: string;
  fieldPath?: string;
  status?: string;
  tickFrom?: number;
  tickTo?: number;
  limit?: number;
};

export const getTimelineAxesPage = (query: TimelineAxisListQuery) =>
  api.getRaw<PagedResponse<TimelineAxis[], TimelineStructListMeta>>(
    `${endpoints.timelineAxes}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createTimelineAxis = (payload: TimelineAxisPayload) =>
  api.post<TimelineAxis>(endpoints.timelineAxes, payload, withDatabaseHeader());

export const updateTimelineAxis = (id: string, payload: TimelineAxisPayload) =>
  api.put<TimelineAxis>(
    `${endpoints.timelineAxes}/${id}`,
    payload,
    withDatabaseHeader()
  );

export const deleteTimelineAxis = (id: string) =>
  api.delete<void>(`${endpoints.timelineAxes}/${id}`, withDatabaseHeader());

export const getTimelineErasPage = (query: TimelineEraListQuery) =>
  api.getRaw<PagedResponse<TimelineEra[], TimelineStructListMeta>>(
    `${endpoints.timelineEras}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createTimelineEra = (payload: TimelineEraPayload) =>
  api.post<TimelineEra>(endpoints.timelineEras, payload, withDatabaseHeader());

export const updateTimelineEra = (id: string, payload: TimelineEraPayload) =>
  api.put<TimelineEra>(
    `${endpoints.timelineEras}/${id}`,
    payload,
    withDatabaseHeader()
  );

export const deleteTimelineEra = (id: string) =>
  api.delete<void>(`${endpoints.timelineEras}/${id}`, withDatabaseHeader());

export const getTimelineSegmentsPage = (query: TimelineSegmentListQuery) =>
  api.getRaw<PagedResponse<TimelineSegment[], TimelineStructListMeta>>(
    `${endpoints.timelineSegments}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createTimelineSegment = (payload: TimelineSegmentPayload) =>
  api.post<TimelineSegment>(endpoints.timelineSegments, payload, withDatabaseHeader());

export const updateTimelineSegment = (
  id: string,
  payload: TimelineSegmentPayload
) =>
  api.put<TimelineSegment>(
    `${endpoints.timelineSegments}/${id}`,
    payload,
    withDatabaseHeader()
  );

export const deleteTimelineSegment = (id: string) =>
  api.delete<void>(`${endpoints.timelineSegments}/${id}`, withDatabaseHeader());

export const getTimelineMarkersPage = (query: TimelineMarkerListQuery) =>
  api.getRaw<PagedResponse<TimelineMarker[], TimelineStructListMeta>>(
    `${endpoints.timelineMarkers}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createTimelineMarker = (payload: TimelineMarkerPayload) =>
  api.post<TimelineMarker>(endpoints.timelineMarkers, payload, withDatabaseHeader());

export const updateTimelineMarker = (id: string, payload: TimelineMarkerPayload) =>
  api.put<TimelineMarker>(
    `${endpoints.timelineMarkers}/${id}`,
    payload,
    withDatabaseHeader()
  );

export const deleteTimelineMarker = (id: string) =>
  api.delete<void>(`${endpoints.timelineMarkers}/${id}`, withDatabaseHeader());

export const getTimelineStateSnapshot = (query: TimelineStateSnapshotQuery) =>
  api.getRaw<PagedResponse<TimelineStateChange[], TimelineStructListMeta>>(
    `${endpoints.timelineStateSnapshot}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const getTimelineStateProjection = (query: TimelineStateSnapshotQuery) =>
  api.getRaw<PagedResponse<unknown[], TimelineStructListMeta>>(
    `${endpoints.timelineStateProjection}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const getTimelineStateDiff = (query: TimelineStateDiffQuery) =>
  api.getRaw<{ data: TimelineStateDiffResult; meta?: TimelineStructListMeta }>(
    `${endpoints.timelineStateDiff}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const getTimelineStateHistory = (query: TimelineStateHistoryQuery) =>
  api.getRaw<PagedResponse<unknown[], TimelineStructListMeta>>(
    `${endpoints.timelineStateHistory}${toQueryString(query)}`,
    withDatabaseHeader()
  );
