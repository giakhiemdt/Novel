import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { Faction, FactionPayload } from "./faction.types";

export const getAllFactions = () =>
  api.get<Faction[]>(endpoints.factions, withDatabaseHeader());

export const createFaction = (payload: FactionPayload) =>
  api.post<Faction>(endpoints.factions, payload, withDatabaseHeader());

export const updateFaction = (id: string, payload: FactionPayload) =>
  api.put<Faction>(`${endpoints.factions}/${id}`, payload, withDatabaseHeader());

export const deleteFaction = (id: string) =>
  api.delete<void>(`${endpoints.factions}/${id}`, withDatabaseHeader());
