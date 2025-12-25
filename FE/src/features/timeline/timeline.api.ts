import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { Timeline, TimelineLinkPayload, TimelinePayload } from "./timeline.types";

export const getAllTimelines = () =>
  api.get<Timeline[]>(endpoints.timelines);

export const createTimeline = (payload: TimelinePayload) =>
  api.post<Timeline>(endpoints.timelines, payload);

export const linkTimeline = (payload: TimelineLinkPayload) =>
  api.post<{ message: string }>(endpoints.timelineLink, payload);

export const unlinkTimeline = (payload: TimelineLinkPayload) =>
  api.post<{ message: string }>(endpoints.timelineUnlink, payload);

export const relinkTimeline = (payload: TimelineLinkPayload) =>
  api.post<{ message: string }>(endpoints.timelineRelink, payload);
