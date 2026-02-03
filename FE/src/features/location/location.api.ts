import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { Location, LocationPayload } from "./location.types";

const getSelectedDatabase = (): string | null =>
  localStorage.getItem("novel-selected-project-db");

const withDatabaseHeader = () => {
  const dbName = getSelectedDatabase();
  return dbName
    ? { headers: { "x-neo4j-database": dbName } }
    : undefined;
};

export const getAllLocations = () =>
  api.get<Location[]>(endpoints.locations, withDatabaseHeader());

export const createLocation = (payload: LocationPayload) =>
  api.post<Location>(endpoints.locations, payload, withDatabaseHeader());

export const updateLocation = (id: string, payload: LocationPayload) =>
  api.put<Location>(`${endpoints.locations}/${id}`, payload, withDatabaseHeader());

export const deleteLocation = (id: string) =>
  api.delete<void>(`${endpoints.locations}/${id}`, withDatabaseHeader());

export const createLocationContains = (payload: {
  parentId: string;
  childId: string;
  sinceYear: number | null;
  untilYear: number | null;
  note: string | null;
}) =>
  api.post<{ message: string }>(
    `${endpoints.locations}/contains`,
    payload,
    withDatabaseHeader()
  );

export const deleteLocationContains = (payload: {
  childId: string;
  parentId?: string;
}) =>
  api.post<{ message: string }>(
    `${endpoints.locations}/contains/unlink`,
    payload,
    withDatabaseHeader()
  );
