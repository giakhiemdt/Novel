export type ProjectStatus = "active" | "archived";

export type ProjectInput = {
  id?: string;
  name: string;
  description?: string;
  dbName: string;
  status?: ProjectStatus;
  notes?: string;
  tags?: string[];
};

export type ProjectNode = ProjectInput & {
  id: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};
