import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { Event, EventPayload } from "./event.types";

export const getAllEvents = () =>
  api.get<Event[]>(endpoints.events, withDatabaseHeader());

export type EventListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  timelineId?: string;
  locationId?: string;
  characterId?: string;
  tag?: string;
  name?: string;
  type?: string;
};

export const getEventsPage = (query: EventListQuery) =>
  api.getRaw<PagedResponse<Event[], PaginationMeta>>(
    `${endpoints.events}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createEvent = (payload: EventPayload) =>
  api.post<Event>(endpoints.events, payload, withDatabaseHeader());

export const updateEvent = (id: string, payload: EventPayload) =>
  api.put<Event>(`${endpoints.events}/${id}`, payload, withDatabaseHeader());

export const deleteEvent = (id: string) =>
  api.delete<void>(`${endpoints.events}/${id}`, withDatabaseHeader());
