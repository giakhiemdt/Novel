import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type { PagedResponse, PaginationMeta } from "../../types/api";
import { toQueryString } from "../../utils/query";
import type { Chapter, ChapterPayload } from "./chapter.types";

export const getAllChapters = () =>
  api.get<Chapter[]>(endpoints.chapters, withDatabaseHeader());

export type ChapterListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  arcId?: string;
};

export const getChaptersPage = (query: ChapterListQuery) =>
  api.getRaw<PagedResponse<Chapter[], PaginationMeta>>(
    `${endpoints.chapters}${toQueryString(query)}`,
    withDatabaseHeader()
  );

export const createChapter = (payload: ChapterPayload) =>
  api.post<Chapter>(endpoints.chapters, payload, withDatabaseHeader());

export const updateChapter = (id: string, payload: ChapterPayload) =>
  api.put<Chapter>(`${endpoints.chapters}/${id}`, payload, withDatabaseHeader());

export const deleteChapter = (id: string) =>
  api.delete<void>(`${endpoints.chapters}/${id}`, withDatabaseHeader());
