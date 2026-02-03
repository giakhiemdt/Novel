import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { Event, EventPayload } from "./event.types";

const getSelectedDatabase = (): string | null =>
  localStorage.getItem("novel-selected-project-db");

const withDatabaseHeader = () => {
  const dbName = getSelectedDatabase();
  return dbName ? { headers: { "x-neo4j-database": dbName } } : undefined;
};

export const getAllEvents = () =>
  api.get<Event[]>(endpoints.events, withDatabaseHeader());

export const createEvent = (payload: EventPayload) =>
  api.post<Event>(endpoints.events, payload, withDatabaseHeader());

export const updateEvent = (id: string, payload: EventPayload) =>
  api.put<Event>(`${endpoints.events}/${id}`, payload, withDatabaseHeader());

export const deleteEvent = (id: string) =>
  api.delete<void>(`${endpoints.events}/${id}`, withDatabaseHeader());
