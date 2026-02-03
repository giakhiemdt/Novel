import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { Character, CharacterPayload } from "./character.types";

const getSelectedDatabase = (): string | null =>
  localStorage.getItem("novel-selected-project-db");

const withDatabaseHeader = () => {
  const dbName = getSelectedDatabase();
  return dbName
    ? { headers: { "x-neo4j-database": dbName } }
    : undefined;
};

export const getAllCharacters = () =>
  api.get<Character[]>(endpoints.characters, withDatabaseHeader());

export const createCharacter = (payload: CharacterPayload) =>
  api.post<Character>(endpoints.characters, payload, withDatabaseHeader());

export const updateCharacter = (id: string, payload: CharacterPayload) =>
  api.put<Character>(`${endpoints.characters}/${id}`, payload, withDatabaseHeader());

export const deleteCharacter = (id: string) =>
  api.delete<void>(`${endpoints.characters}/${id}`, withDatabaseHeader());
