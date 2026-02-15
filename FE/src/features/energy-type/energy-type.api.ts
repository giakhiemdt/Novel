import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { EnergyType, EnergyTypePayload } from "./energy-type.types";

export const getEnergyTypes = (activeOnly = true) =>
  api.get<EnergyType[]>(
    `${endpoints.energyTypes}?activeOnly=${activeOnly ? "true" : "false"}`,
    withDatabaseHeader()
  );

export const createEnergyType = (payload: EnergyTypePayload) =>
  api.post<EnergyType>(endpoints.energyTypes, payload, withDatabaseHeader());

export const updateEnergyType = (id: string, payload: EnergyTypePayload) =>
  api.put<EnergyType>(`${endpoints.energyTypes}/${id}`, payload, withDatabaseHeader());

export const deleteEnergyType = (id: string) =>
  api.delete<void>(`${endpoints.energyTypes}/${id}`, withDatabaseHeader());

