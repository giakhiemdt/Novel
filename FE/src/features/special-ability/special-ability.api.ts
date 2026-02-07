import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { SpecialAbility, SpecialAbilityPayload } from "./special-ability.types";

export const getAllSpecialAbilities = () =>
  api.get<SpecialAbility[]>(endpoints.specialAbilities, withDatabaseHeader());

export type SpecialAbilityListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  type?: string;
};

export const getSpecialAbilitiesPage = (query: SpecialAbilityListQuery) =>
  api.getRaw<PagedResponse<SpecialAbility[], PaginationMeta>>(
    `${endpoints.specialAbilities}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createSpecialAbility = (payload: SpecialAbilityPayload) =>
  api.post<SpecialAbility>(
    endpoints.specialAbilities,
    payload,
    withDatabaseHeader()
  );

export const updateSpecialAbility = (id: string, payload: SpecialAbilityPayload) =>
  api.put<SpecialAbility>(
    `${endpoints.specialAbilities}/${id}`,
    payload,
    withDatabaseHeader()
  );

export const deleteSpecialAbility = (id: string) =>
  api.delete<void>(`${endpoints.specialAbilities}/${id}`, withDatabaseHeader());
