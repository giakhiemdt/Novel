import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { WorldRule, WorldRulePayload } from "./worldrule.types";

export const getAllWorldRules = () =>
  api.get<WorldRule[]>(endpoints.worldRules, withDatabaseHeader());

export type WorldRuleListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  title?: string;
  category?: string;
  status?: string;
  scope?: string;
  tag?: string;
};

export const getWorldRulesPage = (query: WorldRuleListQuery) =>
  api.getRaw<PagedResponse<WorldRule[], PaginationMeta>>(
    `${endpoints.worldRules}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createWorldRule = (payload: WorldRulePayload) =>
  api.post<WorldRule>(endpoints.worldRules, payload, withDatabaseHeader());

export const updateWorldRule = (id: string, payload: WorldRulePayload) =>
  api.put<WorldRule>(`${endpoints.worldRules}/${id}`, payload, withDatabaseHeader());

export const deleteWorldRule = (id: string) =>
  api.delete<void>(`${endpoints.worldRules}/${id}`, withDatabaseHeader());
