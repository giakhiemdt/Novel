import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type {
  CharacterRelation,
  CharacterRelationPayload,
  CharacterRelationQuery,
} from "./relationship.types";

type ApiRelationRecord =
  | CharacterRelation
  | {
      from?: { id?: string };
      to?: { id?: string };
      relation?: {
        type?: string;
        startYear?: number | null;
        endYear?: number | null;
        note?: string | null;
        createdAt?: string | null;
        updatedAt?: string | null;
      };
    };

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

const normalizeRelation = (item: ApiRelationRecord): CharacterRelation | null => {
  const asDirect = item as CharacterRelation;
  if (asDirect.fromId && asDirect.toId && asDirect.type) {
    return asDirect;
  }

  const asStructured = item as {
    from?: { id?: string };
    to?: { id?: string };
    relation?: {
      type?: string;
      startYear?: number | null;
      endYear?: number | null;
      note?: string | null;
      createdAt?: string | null;
      updatedAt?: string | null;
    };
  };

  const fromId = asStructured.from?.id;
  const toId = asStructured.to?.id;
  const type = asStructured.relation?.type;

  if (!fromId || !toId || !type) {
    return null;
  }

  return {
    fromId,
    toId,
    type,
    startYear: asStructured.relation?.startYear ?? undefined,
    endYear: asStructured.relation?.endYear ?? undefined,
    note: asStructured.relation?.note ?? undefined,
    createdAt: asStructured.relation?.createdAt ?? "",
    updatedAt: asStructured.relation?.updatedAt ?? "",
  };
};

export const getRelations = async (
  params?: CharacterRelationQuery
): Promise<CharacterRelation[]> => {
  const data = await api.get<ApiRelationRecord[]>(
    `${endpoints.characterRelations}${buildQuery(params)}`,
    withDatabaseHeader()
  );
  return (data ?? [])
    .map(normalizeRelation)
    .filter((item): item is CharacterRelation => item !== null);
};

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
