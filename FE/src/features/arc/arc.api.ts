import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type { Arc, ArcPayload, ArcStructureArc } from "./arc.types";

export const getAllArcs = () =>
  api.get<Arc[]>(endpoints.arcs, withDatabaseHeader());

export const getArcStructure = () =>
  api.get<ArcStructureArc[]>(endpoints.arcStructure, withDatabaseHeader());

export const createArc = (payload: ArcPayload) =>
  api.post<Arc>(endpoints.arcs, payload, withDatabaseHeader());

export const updateArc = (id: string, payload: ArcPayload) =>
  api.put<Arc>(`${endpoints.arcs}/${id}`, payload, withDatabaseHeader());

export const deleteArc = (id: string) =>
  api.delete<void>(`${endpoints.arcs}/${id}`, withDatabaseHeader());
