import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type { WorldRule, WorldRulePayload } from "./worldrule.types";

export const getAllWorldRules = () =>
  api.get<WorldRule[]>(endpoints.worldRules, withDatabaseHeader());

export const createWorldRule = (payload: WorldRulePayload) =>
  api.post<WorldRule>(endpoints.worldRules, payload, withDatabaseHeader());

export const updateWorldRule = (id: string, payload: WorldRulePayload) =>
  api.put<WorldRule>(`${endpoints.worldRules}/${id}`, payload, withDatabaseHeader());

export const deleteWorldRule = (id: string) =>
  api.delete<void>(`${endpoints.worldRules}/${id}`, withDatabaseHeader());
