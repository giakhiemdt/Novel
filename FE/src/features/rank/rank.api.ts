import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { Rank, RankLinkPayload, RankPayload } from "./rank.types";

export type RankBoardLayout = {
  positions: Record<string, { x: number; y: number }>;
  linkBends?: Record<string, { midX: number }>;
  updatedAt?: string;
};

export const getAllRanks = () =>
  api.get<Rank[]>(endpoints.ranks, withDatabaseHeader());

export type RankListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  tier?: string;
  system?: string;
  systemId?: string;
};

export const getRanksPage = (query: RankListQuery) =>
  api.getRaw<PagedResponse<Rank[], PaginationMeta>>(
    `${endpoints.ranks}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const getRanksBySystem = (systemId: string, query: RankListQuery = {}) =>
  api.getRaw<PagedResponse<Rank[], PaginationMeta>>(
    `${endpoints.rankSystems}/${systemId}/ranks${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createRank = (payload: RankPayload) =>
  api.post<Rank>(endpoints.ranks, payload, withDatabaseHeader());

export const updateRank = (id: string, payload: RankPayload) =>
  api.put<Rank>(`${endpoints.ranks}/${id}`, payload, withDatabaseHeader());

export const deleteRank = (id: string) =>
  api.delete<void>(`${endpoints.ranks}/${id}`, withDatabaseHeader());

export const linkRank = (payload: RankLinkPayload) =>
  api.post<{ message: string }>(`${endpoints.ranks}/link`, payload, withDatabaseHeader());

export const unlinkRank = (payload: RankLinkPayload) =>
  api.post<{ message: string }>(`${endpoints.ranks}/unlink`, payload, withDatabaseHeader());

export const updateRankLinkConditions = (payload: RankLinkPayload) =>
  api.post<{ message: string }>(
    `${endpoints.ranks}/link/conditions`,
    payload,
    withDatabaseHeader()
  );

export const getRankBoardLayout = () =>
  api.get<RankBoardLayout>(`${endpoints.ranks}/board-layout`, withDatabaseHeader());

export const saveRankBoardLayout = (
  positions: Record<string, { x: number; y: number }>,
  linkBends: Record<string, { midX: number }> = {}
) =>
  api.put<RankBoardLayout>(
    `${endpoints.ranks}/board-layout`,
    { positions, linkBends },
    withDatabaseHeader()
  );
