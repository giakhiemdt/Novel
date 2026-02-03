import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { Timeline, TimelineLinkPayload, TimelinePayload } from "./timeline.types";

const getSelectedDatabase = (): string | null =>
  localStorage.getItem("novel-selected-project-db");

const withDatabaseHeader = () => {
  const dbName = getSelectedDatabase();
  return dbName ? { headers: { "x-neo4j-database": dbName } } : undefined;
};

export const getAllTimelines = () =>
  api.get<Timeline[]>(endpoints.timelines, withDatabaseHeader());

export const createTimeline = (payload: TimelinePayload) =>
  api.post<Timeline>(endpoints.timelines, payload, withDatabaseHeader());

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
