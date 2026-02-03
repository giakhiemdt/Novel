import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { OverviewNode, OverviewPayload } from "./overview.types";

const getSelectedDatabase = (): string | null =>
  localStorage.getItem("novel-selected-project-db");

const withDatabaseHeader = () => {
  const dbName = getSelectedDatabase();
  return dbName
    ? { headers: { "x-neo4j-database": dbName } }
    : undefined;
};

export const getOverview = () =>
  api.get<OverviewNode | null>(endpoints.overview, withDatabaseHeader());

export const createOverview = (payload: OverviewPayload) =>
  api.post<OverviewNode>(endpoints.overview, payload, withDatabaseHeader());

export const updateOverview = (payload: OverviewPayload) =>
  api.put<OverviewNode>(endpoints.overview, payload, withDatabaseHeader());
