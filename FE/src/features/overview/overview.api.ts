import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { OverviewNode, OverviewPayload } from "./overview.types";

export const getOverview = () =>
  api.get<OverviewNode | null>(endpoints.overview, withDatabaseHeader());

export const createOverview = (payload: OverviewPayload) =>
  api.post<OverviewNode>(endpoints.overview, payload, withDatabaseHeader());

export const updateOverview = (payload: OverviewPayload) =>
  api.put<OverviewNode>(endpoints.overview, payload, withDatabaseHeader());
