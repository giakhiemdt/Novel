import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { SpecialAbilityListQuery, SpecialAbilityNode } from "./special-ability.types";

const CREATE_SPECIAL_ABILITY = `
CREATE (a:${nodeLabels.specialAbility} {
  id: $id,
  name: $name,
  type: $type,
  description: $description,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN a
`;

const UPDATE_SPECIAL_ABILITY = `
MATCH (a:${nodeLabels.specialAbility} {id: $id})
SET
  a.name = $name,
  a.type = $type,
  a.description = $description,
  a.notes = $notes,
  a.tags = $tags,
  a.updatedAt = $updatedAt
RETURN a
`;

const GET_SPECIAL_ABILITIES = `
MATCH (a:${nodeLabels.specialAbility})
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(a.tags, []))
  AND ($type IS NULL OR a.type = $type)
RETURN a
ORDER BY a.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_SPECIAL_ABILITIES_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("special_ability_search", $q) YIELD node, score
WITH node AS a, score
WHERE
  ($name IS NULL OR toLower(a.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(a.tags, []))
  AND ($type IS NULL OR a.type = $type)
RETURN a
ORDER BY score DESC, a.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_SPECIAL_ABILITY_BY_NAME = `
MATCH (a:${nodeLabels.specialAbility})
WHERE toLower(a.name) = toLower($name)
RETURN a
LIMIT 1
`;

const DELETE_SPECIAL_ABILITY = `
MATCH (a:${nodeLabels.specialAbility} {id: $id})
WITH a
DETACH DELETE a
RETURN 1 AS deleted
`;

const SPECIAL_ABILITY_PARAMS = [
  "id",
  "name",
  "type",
  "description",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const SPECIAL_ABILITY_UPDATE_PARAMS = SPECIAL_ABILITY_PARAMS.filter(
  (key) => key !== "createdAt"
);

export const createSpecialAbility = async (
  data: SpecialAbilityNode,
  database: string
): Promise<SpecialAbilityNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, SPECIAL_ABILITY_PARAMS);
    const result = await session.run(CREATE_SPECIAL_ABILITY, params);
    const record = result.records[0];
    const node = record?.get("a");
    return mapNode(node?.properties ?? data) as SpecialAbilityNode;
  } finally {
    await session.close();
  }
};

export const updateSpecialAbility = async (
  data: SpecialAbilityNode,
  database: string
): Promise<SpecialAbilityNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, SPECIAL_ABILITY_UPDATE_PARAMS);
    const result = await session.run(UPDATE_SPECIAL_ABILITY, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("a");
    return mapNode(node?.properties ?? data) as SpecialAbilityNode;
  } finally {
    await session.close();
  }
};

export const getSpecialAbilities = async (
  database: string,
  query: SpecialAbilityListQuery
): Promise<SpecialAbilityNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_SPECIAL_ABILITIES_BY_SEARCH : GET_SPECIAL_ABILITIES;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
      type: query.type ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("a");
      return mapNode(node?.properties ?? {}) as SpecialAbilityNode;
    });
  } finally {
    await session.close();
  }
};

export const deleteSpecialAbility = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_SPECIAL_ABILITY, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const getSpecialAbilityByName = async (
  database: string,
  name: string
): Promise<SpecialAbilityNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_SPECIAL_ABILITY_BY_NAME, { name });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("a");
    return mapNode(node?.properties ?? {}) as SpecialAbilityNode;
  } finally {
    await session.close();
  }
};
