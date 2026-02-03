import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { CharacterRelationNode, CharacterRelationQuery } from "./relationship.types";

const CREATE_RELATION = `
MATCH (a:${nodeLabels.character} {id: $fromId})
MATCH (b:${nodeLabels.character} {id: $toId})
MERGE (a)-[r:${relationTypes.characterRelatesTo} {type: $type}]->(b)
SET
  r.startYear = $startYear,
  r.endYear = $endYear,
  r.note = $note,
  r.createdAt = $createdAt,
  r.updatedAt = $updatedAt
RETURN r
`;

const UPDATE_RELATION = `
MATCH (a:${nodeLabels.character} {id: $fromId})-[r:${relationTypes.characterRelatesTo} {type: $type}]->(b:${nodeLabels.character} {id: $toId})
SET
  r.startYear = $startYear,
  r.endYear = $endYear,
  r.note = $note,
  r.updatedAt = $updatedAt
RETURN r
`;

const DELETE_RELATION = `
MATCH (a:${nodeLabels.character} {id: $fromId})-[r:${relationTypes.characterRelatesTo} {type: $type}]->(b:${nodeLabels.character} {id: $toId})
DELETE r
RETURN 1 AS deleted
`;

const GET_RELATIONS = `
MATCH (a:${nodeLabels.character})-[r:${relationTypes.characterRelatesTo}]->(b:${nodeLabels.character})
WHERE
  ($characterId IS NULL OR a.id = $characterId OR b.id = $characterId)
  AND ($type IS NULL OR r.type = $type)
RETURN a, b, r
ORDER BY r.updatedAt DESC
`;

const CHECK_CHARACTER = `
MATCH (c:${nodeLabels.character} {id: $id})
RETURN c IS NOT NULL AS exists
`;

export const checkCharacterExists = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHECK_CHARACTER, { id });
    return (result.records[0]?.get("exists") as boolean | undefined) ?? false;
  } finally {
    await session.close();
  }
};

export const createRelation = async (
  database: string,
  data: CharacterRelationNode
): Promise<CharacterRelationNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(CREATE_RELATION, {
      ...data,
      startYear: data.startYear ?? null,
      endYear: data.endYear ?? null,
      note: data.note ?? null,
    });
    const record = result.records[0];
    if (!record) {
      return data;
    }
    return data;
  } finally {
    await session.close();
  }
};

export const updateRelation = async (
  database: string,
  data: CharacterRelationNode
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(UPDATE_RELATION, {
      ...data,
      startYear: data.startYear ?? null,
      endYear: data.endYear ?? null,
      note: data.note ?? null,
    });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const deleteRelation = async (
  database: string,
  fromId: string,
  toId: string,
  type: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_RELATION, { fromId, toId, type });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const getRelations = async (
  database: string,
  query: CharacterRelationQuery
): Promise<
  {
    from: { id: string; name: string };
    to: { id: string; name: string };
    relation: {
      type: string;
      startYear?: number | null;
      endYear?: number | null;
      note?: string | null;
      createdAt?: string | null;
      updatedAt?: string | null;
    };
  }[]
> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_RELATIONS, {
      characterId: query.characterId ?? null,
      type: query.type ?? null,
    });
    return result.records.map((record) => {
      const from = record.get("a");
      const to = record.get("b");
      const rel = record.get("r");
      return {
        from: { id: from?.properties?.id ?? "", name: from?.properties?.name ?? "" },
        to: { id: to?.properties?.id ?? "", name: to?.properties?.name ?? "" },
        relation: {
          type: rel?.properties?.type ?? "",
          startYear: rel?.properties?.startYear ?? null,
          endYear: rel?.properties?.endYear ?? null,
          note: rel?.properties?.note ?? null,
          createdAt: rel?.properties?.createdAt ?? null,
          updatedAt: rel?.properties?.updatedAt ?? null,
        },
      };
    });
  } finally {
    await session.close();
  }
};
