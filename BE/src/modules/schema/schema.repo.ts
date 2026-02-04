import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { EntitySchemaNode } from "./schema.types";

const CREATE_SCHEMA = `
CREATE (s:${nodeLabels.entitySchema} {
  id: $id,
  entity: $entity,
  title: $title,
  fields: $fields,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN s
`;

const UPDATE_SCHEMA = `
MATCH (s:${nodeLabels.entitySchema} {entity: $entity})
SET
  s.title = $title,
  s.fields = $fields,
  s.updatedAt = $updatedAt
RETURN s
`;

const GET_SCHEMA_BY_ENTITY = `
MATCH (s:${nodeLabels.entitySchema} {entity: $entity})
RETURN s
LIMIT 1
`;

const DELETE_SCHEMA = `
MATCH (s:${nodeLabels.entitySchema} {entity: $entity})
DETACH DELETE s
RETURN 1 AS deleted
`;

const SCHEMA_PARAMS = ["id", "entity", "title", "fields", "createdAt", "updatedAt"];

const SCHEMA_UPDATE_PARAMS = ["entity", "title", "fields", "updatedAt"];

export const createSchema = async (
  data: EntitySchemaNode,
  database: string
): Promise<EntitySchemaNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, SCHEMA_PARAMS);
    const result = await session.run(CREATE_SCHEMA, params);
    const record = result.records[0];
    const node = record?.get("s");
    return mapNode(node?.properties ?? data) as EntitySchemaNode;
  } finally {
    await session.close();
  }
};

export const upsertSchema = async (
  data: EntitySchemaNode,
  database: string
): Promise<EntitySchemaNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, SCHEMA_UPDATE_PARAMS);
    const result = await session.run(UPDATE_SCHEMA, params);
    const record = result.records[0];
    if (record) {
      const node = record.get("s");
      return mapNode(node?.properties ?? data) as EntitySchemaNode;
    }
    return createSchema(data, database);
  } finally {
    await session.close();
  }
};

export const getSchemaByEntity = async (
  database: string,
  entity: string
): Promise<EntitySchemaNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_SCHEMA_BY_ENTITY, { entity });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("s");
    return mapNode(node?.properties ?? {}) as EntitySchemaNode;
  } finally {
    await session.close();
  }
};

export const deleteSchemaByEntity = async (
  database: string,
  entity: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_SCHEMA, { entity });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};
