import { api } from "../../services/api";
import { withDatabaseHeader } from "../../services/db";
import { endpoints } from "../../services/endpoints";
import type { ConflictReport } from "./conflict.types";

export const getConflictReport = () =>
  api.get<ConflictReport>(endpoints.conflicts, withDatabaseHeader());
