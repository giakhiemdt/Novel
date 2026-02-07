import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { Location, LocationPayload } from "./location.types";

export const getAllLocations = () =>
  api.get<Location[]>(endpoints.locations, withDatabaseHeader());

export type LocationListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  type?: string;
  category?: string;
  isSecret?: boolean;
  isHabitable?: boolean;
  parentId?: string;
};

export const getLocationsPage = (query: LocationListQuery) =>
  api.getRaw<PagedResponse<Location[], PaginationMeta>>(
    `${endpoints.locations}${toQueryString(query)}`,
    withDatabaseHeader()
  );

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
