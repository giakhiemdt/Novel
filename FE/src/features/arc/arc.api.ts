import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { Arc, ArcPayload, ArcStructureArc } from "./arc.types";

export const getAllArcs = () =>
  api.get<Arc[]>(endpoints.arcs, withDatabaseHeader());

export type ArcListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
};

export const getArcsPage = (query: ArcListQuery) =>
  api.getRaw<PagedResponse<Arc[], PaginationMeta>>(
    `${endpoints.arcs}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const getArcStructure = () =>
  api.get<ArcStructureArc[]>(endpoints.arcStructure, withDatabaseHeader());

export const createArc = (payload: ArcPayload) =>
  api.post<Arc>(endpoints.arcs, payload, withDatabaseHeader());

export const updateArc = (id: string, payload: ArcPayload) =>
  api.put<Arc>(`${endpoints.arcs}/${id}`, payload, withDatabaseHeader());

export const deleteArc = (id: string) =>
  api.delete<void>(`${endpoints.arcs}/${id}`, withDatabaseHeader());
