import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { mapNode } from "../../shared/utils/map-node";
import { RelationshipTypeNode } from "./relationship-type.types";

const DEFAULT_RELATIONSHIP_TYPES = [
  {
    code: "family",
    name: "Family",
    description: "Bloodline or family relationship",
    isDirectional: false,
    color: "#D97706",
  },
  {
    code: "ally",
    name: "Ally",
    description: "Cooperative or allied relationship",
    isDirectional: false,
    color: "#059669",
  },
  {
    code: "enemy",
    name: "Enemy",
    description: "Hostile relationship",
    isDirectional: false,
    color: "#DC2626",
  },
  {
    code: "romance",
    name: "Romance",
    description: "Romantic relationship",
    isDirectional: false,
    color: "#DB2777",
  },
  {
    code: "mentor",
    name: "Mentor",
    description: "Guidance relationship, often directional",
    isDirectional: true,
    color: "#2563EB",
  },
  {
    code: "rival",
    name: "Rival",
    description: "Competitive relationship",
    isDirectional: false,
    color: "#7C3AED",
  },
  {
    code: "other",
    name: "Other",
    description: "Custom or uncategorized relationship",
    isDirectional: false,
    color: "#6B7280",
  },
] as const;

const CREATE_TYPE = `
CREATE (t:${nodeLabels.relationshipType} {
  id: $id,
  code: $code,
  name: $name,
  description: $description,
  isDirectional: $isDirectional,
  color: $color,
  isSystem: $isSystem,
  isActive: $isActive,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN t
`;

const UPDATE_TYPE = `
MATCH (t:${nodeLabels.relationshipType} {id: $id})
SET
  t.code = $code,
  t.name = $name,
  t.description = $description,
  t.isDirectional = $isDirectional,
  t.color = $color,
  t.isActive = $isActive,
  t.updatedAt = $updatedAt
RETURN t
`;

const GET_TYPES = `
MATCH (t:${nodeLabels.relationshipType})
WHERE ($activeOnly = false OR t.isActive = true)
RETURN t
ORDER BY t.isSystem DESC, t.name ASC
`;

const GET_TYPE_BY_CODE = `
MATCH (t:${nodeLabels.relationshipType} {code: $code})
RETURN t
LIMIT 1
`;

const GET_TYPE_BY_ID = `
MATCH (t:${nodeLabels.relationshipType} {id: $id})
RETURN t
LIMIT 1
`;

const DELETE_TYPE = `
MATCH (t:${nodeLabels.relationshipType} {id: $id})
DETACH DELETE t
RETURN 1 AS deleted
`;

const COUNT_RELATIONS_BY_TYPE = `
MATCH ()-[r:${relationTypes.characterRelatesTo} {type: $typeCode}]->()
RETURN count(r) AS total
`;

const DELETE_RELATIONS_BY_TYPE = `
MATCH ()-[r:${relationTypes.characterRelatesTo} {type: $typeCode}]->()
WITH count(r) AS total
MATCH ()-[r2:${relationTypes.characterRelatesTo} {type: $typeCode}]->()
DELETE r2
RETURN total AS deleted
`;

const ENSURE_DEFAULT_TYPES = `
UNWIND $defaults AS item
MERGE (t:${nodeLabels.relationshipType} {code: item.code})
ON CREATE SET
  t.id = item.id,
  t.name = item.name,
  t.description = item.description,
  t.isDirectional = item.isDirectional,
  t.color = item.color,
  t.isSystem = true,
  t.isActive = true,
  t.createdAt = item.createdAt,
  t.updatedAt = item.updatedAt
RETURN count(t) AS total
`;

export const ensureDefaultRelationshipTypes = async (
  database: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const now = new Date().toISOString();
    const defaults = DEFAULT_RELATIONSHIP_TYPES.map((item) => ({
      id: `relationship-type-${item.code}`,
      ...item,
      createdAt: now,
      updatedAt: now,
    }));
    await session.run(ENSURE_DEFAULT_TYPES, { defaults });
  } finally {
    await session.close();
  }
};

export const createRelationshipType = async (
  database: string,
  data: RelationshipTypeNode
): Promise<RelationshipTypeNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(CREATE_TYPE, data);
    const record = result.records[0];
    const node = record?.get("t");
    return mapNode(node?.properties ?? data) as RelationshipTypeNode;
  } finally {
    await session.close();
  }
};

export const updateRelationshipType = async (
  database: string,
  data: RelationshipTypeNode
): Promise<RelationshipTypeNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(UPDATE_TYPE, {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      isDirectional: data.isDirectional,
      color: data.color ?? null,
      isActive: data.isActive,
      updatedAt: data.updatedAt,
    });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("t");
    return mapNode(node?.properties ?? {}) as RelationshipTypeNode;
  } finally {
    await session.close();
  }
};

export const getRelationshipTypes = async (
  database: string,
  activeOnly: boolean
): Promise<RelationshipTypeNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_TYPES, { activeOnly });
    return result.records.map((record) => {
      const node = record.get("t");
      return mapNode(node?.properties ?? {}) as RelationshipTypeNode;
    });
  } finally {
    await session.close();
  }
};

export const getRelationshipTypeByCode = async (
  database: string,
  code: string
): Promise<RelationshipTypeNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_TYPE_BY_CODE, { code });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("t");
    return mapNode(node?.properties ?? {}) as RelationshipTypeNode;
  } finally {
    await session.close();
  }
};

export const getRelationshipTypeById = async (
  database: string,
  id: string
): Promise<RelationshipTypeNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_TYPE_BY_ID, { id });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("t");
    return mapNode(node?.properties ?? {}) as RelationshipTypeNode;
  } finally {
    await session.close();
  }
};

export const deleteRelationshipType = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_TYPE, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const countCharacterRelationsByType = async (
  database: string,
  typeCode: string
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(COUNT_RELATIONS_BY_TYPE, { typeCode });
    const total = result.records[0]?.get("total");
    if (neo4j.isInt(total)) {
      return total.toNumber();
    }
    return typeof total === "number" ? total : 0;
  } finally {
    await session.close();
  }
};

export const deleteCharacterRelationsByType = async (
  database: string,
  typeCode: string
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_RELATIONS_BY_TYPE, { typeCode });
    const deleted = result.records[0]?.get("deleted");
    if (neo4j.isInt(deleted)) {
      return deleted.toNumber();
    }
    return typeof deleted === "number" ? deleted : 0;
  } finally {
    await session.close();
  }
};
