import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { Scene, ScenePayload } from "./scene.types";

export const getAllScenes = () =>
  api.get<Scene[]>(endpoints.scenes, withDatabaseHeader());

export type SceneListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  chapterId?: string;
  eventId?: string;
  locationId?: string;
  characterId?: string;
};

export const getScenesPage = (query: SceneListQuery) =>
  api.getRaw<PagedResponse<Scene[], PaginationMeta>>(
    `${endpoints.scenes}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createScene = (payload: ScenePayload) =>
  api.post<Scene>(endpoints.scenes, payload, withDatabaseHeader());

export const updateScene = (id: string, payload: ScenePayload) =>
  api.put<Scene>(`${endpoints.scenes}/${id}`, payload, withDatabaseHeader());

export const deleteScene = (id: string) =>
  api.delete<void>(`${endpoints.scenes}/${id}`, withDatabaseHeader());
