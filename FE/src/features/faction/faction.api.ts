import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { Faction, FactionPayload } from "./faction.types";

const getSelectedDatabase = (): string | null =>
  localStorage.getItem("novel-selected-project-db");

const withDatabaseHeader = () => {
  const dbName = getSelectedDatabase();
  return dbName
    ? { headers: { "x-neo4j-database": dbName } }
    : undefined;
};

export const getAllFactions = () =>
  api.get<Faction[]>(endpoints.factions, withDatabaseHeader());

export const createFaction = (payload: FactionPayload) =>
  api.post<Faction>(endpoints.factions, payload, withDatabaseHeader());

export const updateFaction = (id: string, payload: FactionPayload) =>
  api.put<Faction>(`${endpoints.factions}/${id}`, payload, withDatabaseHeader());

export const deleteFaction = (id: string) =>
  api.delete<void>(`${endpoints.factions}/${id}`, withDatabaseHeader());
