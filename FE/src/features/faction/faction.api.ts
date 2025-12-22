import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { Faction, FactionPayload } from "./faction.types";

export const createFaction = (payload: FactionPayload) =>
  api.post<Faction>(endpoints.factions, payload);
