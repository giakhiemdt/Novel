import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { Character, CharacterPayload } from "./character.types";

export const getAllCharacters = () =>
  api.get<Character[]>(endpoints.characters, withDatabaseHeader());

export type CharacterListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  race?: string;
  specialAbility?: string;
  gender?: string;
  status?: string;
  level?: string;
  isMainCharacter?: boolean;
};

export const getCharactersPage = (query: CharacterListQuery) =>
  api.getRaw<PagedResponse<Character[], PaginationMeta>>(
    `${endpoints.characters}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createCharacter = (payload: CharacterPayload) =>
  api.post<Character>(endpoints.characters, payload, withDatabaseHeader());

export const updateCharacter = (id: string, payload: CharacterPayload) =>
  api.put<Character>(`${endpoints.characters}/${id}`, payload, withDatabaseHeader());

export const deleteCharacter = (id: string) =>
  api.delete<void>(`${endpoints.characters}/${id}`, withDatabaseHeader());
