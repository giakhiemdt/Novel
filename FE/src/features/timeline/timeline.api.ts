import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { Timeline, TimelineLinkPayload, TimelinePayload } from "./timeline.types";

export const getAllTimelines = () =>
  api.get<Timeline[]>(endpoints.timelines, withDatabaseHeader());

export type TimelineListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  code?: string;
  isOngoing?: boolean;
};

export const getTimelinesPage = (query: TimelineListQuery) =>
  api.getRaw<PagedResponse<Timeline[], PaginationMeta>>(
    `${endpoints.timelines}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createTimeline = (payload: TimelinePayload) =>
  api.post<Timeline>(endpoints.timelines, payload, withDatabaseHeader());

export const updateTimeline = (id: string, payload: TimelinePayload) =>
  api.put<Timeline>(`${endpoints.timelines}/${id}`, payload, withDatabaseHeader());

export const linkTimeline = (payload: TimelineLinkPayload) =>
  api.post<{ message: string }>(endpoints.timelineLink, payload, withDatabaseHeader());

export const unlinkTimeline = (payload: TimelineLinkPayload) =>
  api.post<{ message: string }>(
    endpoints.timelineUnlink,
    payload,
    withDatabaseHeader()
  );

export const relinkTimeline = (payload: TimelineLinkPayload) =>
  api.post<{ message: string }>(
    endpoints.timelineRelink,
    payload,
    withDatabaseHeader()
  );

export const deleteTimeline = (id: string) =>
  api.delete<void>(`${endpoints.timelines}/${id}`, withDatabaseHeader());
