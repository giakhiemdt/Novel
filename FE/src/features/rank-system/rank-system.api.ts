import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { RankSystem, RankSystemPayload } from "./rank-system.types";

export const getAllRankSystems = () =>
  api.get<RankSystem[]>(endpoints.rankSystems, withDatabaseHeader());

export type RankSystemListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  domain?: string;
};

export const getRankSystemsPage = (query: RankSystemListQuery) =>
  api.getRaw<PagedResponse<RankSystem[], PaginationMeta>>(
    `${endpoints.rankSystems}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createRankSystem = (payload: RankSystemPayload) =>
  api.post<RankSystem>(endpoints.rankSystems, payload, withDatabaseHeader());

export const updateRankSystem = (id: string, payload: RankSystemPayload) =>
  api.put<RankSystem>(`${endpoints.rankSystems}/${id}`, payload, withDatabaseHeader());

export const deleteRankSystem = (id: string) =>
  api.delete<void>(`${endpoints.rankSystems}/${id}`, withDatabaseHeader());
