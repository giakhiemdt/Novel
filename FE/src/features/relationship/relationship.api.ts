import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type {
  CharacterRelation,
  CharacterRelationPayload,
  CharacterRelationQuery,
} from "./relationship.types";

const buildQuery = (params?: CharacterRelationQuery) => {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  if (params.characterId) {
    search.set("characterId", params.characterId);
  }
  if (params.type) {
    search.set("type", params.type);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
};

export const getRelations = (params?: CharacterRelationQuery) =>
  api.get<CharacterRelation[]>(
    `${endpoints.characterRelations}${buildQuery(params)}`,
    withDatabaseHeader()
  );

export const createRelation = (payload: CharacterRelationPayload) =>
  api.post<CharacterRelation>(
    endpoints.characterRelations,
    payload,
    withDatabaseHeader()
  );

export const updateRelation = (payload: CharacterRelationPayload) =>
  api.put<{ message: string }>(
    endpoints.characterRelations,
    payload,
    withDatabaseHeader()
  );

export const deleteRelation = (payload: CharacterRelationPayload) =>
  api.delete<{ message: string }>(endpoints.characterRelations, {
    ...(withDatabaseHeader() ?? {}),
    body: payload,
  });
