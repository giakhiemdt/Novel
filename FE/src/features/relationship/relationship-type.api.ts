import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type {
  RelationshipType,
  RelationshipTypePayload,
} from "./relationship-type.types";

const buildQuery = (activeOnly?: boolean) => {
  if (activeOnly === undefined) {
    return "";
  }
  const search = new URLSearchParams();
  search.set("activeOnly", String(activeOnly));
  const query = search.toString();
  return query ? `?${query}` : "";
};

export const getRelationshipTypes = (activeOnly?: boolean) =>
  api.get<RelationshipType[]>(
    `${endpoints.relationshipTypes}${buildQuery(activeOnly)}`,
    withDatabaseHeader()
  );

export const createRelationshipType = (payload: RelationshipTypePayload) =>
  api.post<RelationshipType>(
    endpoints.relationshipTypes,
    payload,
    withDatabaseHeader()
  );

export const updateRelationshipType = (
  id: string,
  payload: RelationshipTypePayload
) =>
  api.put<RelationshipType>(
    `${endpoints.relationshipTypes}/${id}`,
    payload,
    withDatabaseHeader()
  );

export const deleteRelationshipType = (id: string) =>
  api.delete<void>(`${endpoints.relationshipTypes}/${id}`, withDatabaseHeader());
