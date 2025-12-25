import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import type { ProjectInput, ProjectNode } from "./project.types";

export const getProjects = () => api.get<ProjectNode[]>(endpoints.projects);

export const createProject = (payload: ProjectInput) =>
  api.post<ProjectNode>(endpoints.projects, payload);
