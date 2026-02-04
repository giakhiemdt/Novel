import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { Race, RacePayload } from "./race.types";

export const getAllRaces = () =>
  api.get<Race[]>(endpoints.races, withDatabaseHeader());

export const createRace = (payload: RacePayload) =>
  api.post<Race>(endpoints.races, payload, withDatabaseHeader());

export const updateRace = (id: string, payload: RacePayload) =>
  api.put<Race>(`${endpoints.races}/${id}`, payload, withDatabaseHeader());

export const deleteRace = (id: string) =>
  api.delete<void>(`${endpoints.races}/${id}`, withDatabaseHeader());
