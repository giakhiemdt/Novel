import { api } from "../../services/api";
import { endpoints } from "../../services/endpoints";
import { withDatabaseHeader } from "../../services/db";
import type { EntitySchema } from "./schema.types";

export const getSchemaByEntity = (entity: string) =>
  api.get<EntitySchema>(`${endpoints.schemas}/${entity}`, withDatabaseHeader());

export const upsertSchema = (payload: EntitySchema) =>
  api.put<EntitySchema>(endpoints.schemas, payload, withDatabaseHeader());
