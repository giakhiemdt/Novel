import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { MapSystem, MapSystemPayload } from "./map-system.types";

export type MapSystemListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  code?: string;
  scope?: string;
};

export const getMapSystemsPage = (query: MapSystemListQuery) =>
  api.getRaw<PagedResponse<MapSystem[], PaginationMeta>>(
    `${endpoints.mapSystems}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createMapSystem = (payload: MapSystemPayload) =>
  api.post<MapSystem>(endpoints.mapSystems, payload, withDatabaseHeader());

export const updateMapSystem = (id: string, payload: MapSystemPayload) =>
  api.put<MapSystem>(`${endpoints.mapSystems}/${id}`, payload, withDatabaseHeader());

export const deleteMapSystem = (id: string) =>
  api.delete<void>(`${endpoints.mapSystems}/${id}`, withDatabaseHeader());
