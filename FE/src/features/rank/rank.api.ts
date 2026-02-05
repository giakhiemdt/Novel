import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { Rank, RankLinkPayload, RankPayload } from "./rank.types";

export const getAllRanks = () =>
  api.get<Rank[]>(endpoints.ranks, withDatabaseHeader());

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
