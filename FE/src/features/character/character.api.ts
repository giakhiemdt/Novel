import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { Character, CharacterPayload } from "./character.types";

export const getAllCharacters = () =>
  api.get<Character[]>(endpoints.characters);

export const createCharacter = (payload: CharacterPayload) =>
  api.post<Character>(endpoints.characters, payload);
