import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { CharacterListQuery, CharacterNode } from "./character.types";

const CREATE_CHARACTER = `
CREATE (c:${nodeLabels.character} {
  id: $id,
  name: $name,
  alias: $alias,
  level: $level,
  status: $status,
  isMainCharacter: $isMainCharacter,
  gender: $gender,
  age: $age,
  race: $race,
  specialAbility: $specialAbility,
  appearance: $appearance,
  height: $height,
  distinctiveTraits: $distinctiveTraits,
  personalityTraits: $personalityTraits,
  beliefs: $beliefs,
  fears: $fears,
  desires: $desires,
  weaknesses: $weaknesses,
  origin: $origin,
  background: $background,
  trauma: $trauma,
  secret: $secret,
  currentLocation: $currentLocation,
  currentGoal: $currentGoal,
  currentAffiliation: $currentAffiliation,
  powerState: $powerState,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN c
`;

const UPDATE_CHARACTER = `
MATCH (c:${nodeLabels.character} {id: $id})
SET
  c.name = $name,
  c.alias = $alias,
  c.level = $level,
  c.status = $status,
  c.isMainCharacter = $isMainCharacter,
  c.gender = $gender,
  c.age = $age,
  c.race = $race,
  c.specialAbility = $specialAbility,
  c.appearance = $appearance,
  c.height = $height,
  c.distinctiveTraits = $distinctiveTraits,
  c.personalityTraits = $personalityTraits,
  c.beliefs = $beliefs,
  c.fears = $fears,
  c.desires = $desires,
  c.weaknesses = $weaknesses,
  c.origin = $origin,
  c.background = $background,
  c.trauma = $trauma,
  c.secret = $secret,
  c.currentLocation = $currentLocation,
  c.currentGoal = $currentGoal,
  c.currentAffiliation = $currentAffiliation,
  c.powerState = $powerState,
  c.notes = $notes,
  c.tags = $tags,
  c.updatedAt = $updatedAt
RETURN c
`;

const GET_CHARACTERS = `
MATCH (c:${nodeLabels.character})
WHERE
  ($name IS NULL OR toLower(c.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(c.tags, []))
  AND ($race IS NULL OR c.race = $race)
  AND ($specialAbility IS NULL OR c.specialAbility = $specialAbility)
  AND ($gender IS NULL OR c.gender = $gender)
  AND ($status IS NULL OR c.status = $status)
  AND ($level IS NULL OR c.level = $level)
  AND ($isMainCharacter IS NULL OR c.isMainCharacter = $isMainCharacter)
RETURN c
ORDER BY c.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_CHARACTERS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("character_search", $q) YIELD node, score
WITH node AS c, score
WHERE
  ($name IS NULL OR toLower(c.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(c.tags, []))
  AND ($race IS NULL OR c.race = $race)
  AND ($specialAbility IS NULL OR c.specialAbility = $specialAbility)
  AND ($gender IS NULL OR c.gender = $gender)
  AND ($status IS NULL OR c.status = $status)
  AND ($level IS NULL OR c.level = $level)
  AND ($isMainCharacter IS NULL OR c.isMainCharacter = $isMainCharacter)
RETURN c
ORDER BY score DESC, c.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const DELETE_CHARACTER = `
MATCH (c:${nodeLabels.character} {id: $id})
WITH c
DETACH DELETE c
RETURN 1 AS deleted
`;

const LINK_CHARACTER_RACE = `
MATCH (c:${nodeLabels.character} {id: $characterId})
MATCH (r:${nodeLabels.race})
WHERE toLower(r.name) = toLower($raceName)
MERGE (c)-[:${relationTypes.characterHasRace}]->(r)
RETURN r
`;

const UNLINK_CHARACTER_RACE = `
MATCH (c:${nodeLabels.character} {id: $characterId})
MATCH (c)-[rel:${relationTypes.characterHasRace}]->(:${nodeLabels.race})
DELETE rel
RETURN count(rel) AS deleted
`;

const LINK_CHARACTER_RANK = `
MATCH (c:${nodeLabels.character} {id: $characterId})
MATCH (r:${nodeLabels.rank})
WHERE toLower(r.name) = toLower($rankName)
MERGE (c)-[:${relationTypes.characterHasRank}]->(r)
RETURN r
`;

const UNLINK_CHARACTER_RANK = `
MATCH (c:${nodeLabels.character} {id: $characterId})
MATCH (c)-[rel:${relationTypes.characterHasRank}]->(:${nodeLabels.rank})
DELETE rel
RETURN count(rel) AS deleted
`;

const LINK_CHARACTER_SPECIAL_ABILITY = `
MATCH (c:${nodeLabels.character} {id: $characterId})
MATCH (a:${nodeLabels.specialAbility})
WHERE toLower(a.name) = toLower($abilityName)
MERGE (c)-[:${relationTypes.characterHasSpecialAbility}]->(a)
RETURN a
`;

const UNLINK_CHARACTER_SPECIAL_ABILITY = `
MATCH (c:${nodeLabels.character} {id: $characterId})
MATCH (c)-[rel:${relationTypes.characterHasSpecialAbility}]->(:${nodeLabels.specialAbility})
DELETE rel
RETURN count(rel) AS deleted
`;

const CHARACTER_PARAMS = [
  "id",
  "name",
  "alias",
  "level",
  "status",
  "isMainCharacter",
  "gender",
  "age",
  "race",
  "specialAbility",
  "appearance",
  "height",
  "distinctiveTraits",
  "personalityTraits",
  "beliefs",
  "fears",
  "desires",
  "weaknesses",
  "origin",
  "background",
  "trauma",
  "secret",
  "currentLocation",
  "currentGoal",
  "currentAffiliation",
  "powerState",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const CHARACTER_UPDATE_PARAMS = CHARACTER_PARAMS.filter(
  (key) => key !== "createdAt"
);

export const createCharacter = async (
  data: CharacterNode,
  database: string
): Promise<CharacterNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, CHARACTER_PARAMS);
    const result = await session.run(CREATE_CHARACTER, params);
    const record = result.records[0];
    const node = record?.get("c");
    return mapNode(node?.properties ?? data) as CharacterNode;
  } finally {
    await session.close();
  }
};

export const updateCharacter = async (
  data: CharacterNode,
  database: string
): Promise<CharacterNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, CHARACTER_UPDATE_PARAMS);
    const result = await session.run(UPDATE_CHARACTER, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("c");
    return mapNode(node?.properties ?? data) as CharacterNode;
  } finally {
    await session.close();
  }
};

export const getCharacters = async (
  database: string,
  query: CharacterListQuery
): Promise<CharacterNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_CHARACTERS_BY_SEARCH : GET_CHARACTERS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
      race: query.race ?? null,
      specialAbility: query.specialAbility ?? null,
      gender: query.gender ?? null,
      status: query.status ?? null,
      level: query.level ?? null,
      isMainCharacter:
        typeof query.isMainCharacter === "boolean"
          ? query.isMainCharacter
          : null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("c");
      return mapNode(node?.properties ?? {}) as CharacterNode;
    });
  } finally {
    await session.close();
  }
};

export const deleteCharacter = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_CHARACTER, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const linkCharacterRace = async (
  database: string,
  characterId: string,
  raceName: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(LINK_CHARACTER_RACE, {
      characterId,
      raceName,
    });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const unlinkCharacterRace = async (
  database: string,
  characterId: string
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(UNLINK_CHARACTER_RACE, { characterId });
    const record = result.records[0];
    const deleted = record?.get("deleted");
    if (typeof deleted?.toNumber === "function") {
      return deleted.toNumber();
    }
    return typeof deleted === "number" ? deleted : 0;
  } finally {
    await session.close();
  }
};

export const linkCharacterRank = async (
  database: string,
  characterId: string,
  rankName: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(LINK_CHARACTER_RANK, {
      characterId,
      rankName,
    });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const unlinkCharacterRank = async (
  database: string,
  characterId: string
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(UNLINK_CHARACTER_RANK, { characterId });
    const record = result.records[0];
    const deleted = record?.get("deleted");
    if (typeof deleted?.toNumber === "function") {
      return deleted.toNumber();
    }
    return typeof deleted === "number" ? deleted : 0;
  } finally {
    await session.close();
  }
};

export const linkCharacterSpecialAbility = async (
  database: string,
  characterId: string,
  abilityName: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(LINK_CHARACTER_SPECIAL_ABILITY, {
      characterId,
      abilityName,
    });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const unlinkCharacterSpecialAbility = async (
  database: string,
  characterId: string
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(UNLINK_CHARACTER_SPECIAL_ABILITY, {
      characterId,
    });
    const record = result.records[0];
    const deleted = record?.get("deleted");
    if (typeof deleted?.toNumber === "function") {
      return deleted.toNumber();
    }
    return typeof deleted === "number" ? deleted : 0;
  } finally {
    await session.close();
  }
};
