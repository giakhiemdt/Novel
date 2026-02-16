import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type {
  EnergyTier,
  EnergyTierLinkPayload,
  EnergyTierPayload,
} from "./energy-tier.types";

export const getEnergyTiers = (activeOnly = true, energyTypeId?: string) => {
  const params = new URLSearchParams();
  params.set("activeOnly", activeOnly ? "true" : "false");
  if (energyTypeId) {
    params.set("energyTypeId", energyTypeId);
  }
  return api.get<EnergyTier[]>(`${endpoints.energyTiers}?${params.toString()}`, withDatabaseHeader());
};

export const createEnergyTier = (payload: EnergyTierPayload) =>
  api.post<EnergyTier>(endpoints.energyTiers, payload, withDatabaseHeader());

export const updateEnergyTier = (id: string, payload: EnergyTierPayload) =>
  api.put<EnergyTier>(`${endpoints.energyTiers}/${id}`, payload, withDatabaseHeader());

export const deleteEnergyTier = (id: string) =>
  api.delete<void>(`${endpoints.energyTiers}/${id}`, withDatabaseHeader());

export const linkEnergyTier = (payload: EnergyTierLinkPayload) =>
  api.post<{ message?: string }>(`${endpoints.energyTiers}/link`, payload, withDatabaseHeader());

export const unlinkEnergyTier = (payload: Pick<EnergyTierLinkPayload, "previousId" | "currentId">) =>
  api.post<{ message?: string }>(`${endpoints.energyTiers}/unlink`, payload, withDatabaseHeader());
