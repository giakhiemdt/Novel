import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { RaceListQuery, RaceNode } from "./race.types";

const CREATE_RACE = `
CREATE (r:${nodeLabels.race} {
  id: $id,
  name: $name,
  alias: $alias,
  description: $description,
  origin: $origin,
  traits: $traits,
  culture: $culture,
  lifespan: $lifespan,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN r
`;

const UPDATE_RACE = `
MATCH (r:${nodeLabels.race} {id: $id})
SET
  r.name = $name,
  r.alias = $alias,
  r.description = $description,
  r.origin = $origin,
  r.traits = $traits,
  r.culture = $culture,
  r.lifespan = $lifespan,
  r.notes = $notes,
  r.tags = $tags,
  r.updatedAt = $updatedAt
RETURN r
`;

const GET_RACES = `
MATCH (r:${nodeLabels.race})
WHERE
  ($name IS NULL OR toLower(r.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
  AND ($origin IS NULL OR r.origin = $origin)
  AND ($culture IS NULL OR r.culture = $culture)
RETURN r
ORDER BY r.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_RACES_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("race_search", $q) YIELD node, score
WITH node AS r, score
WHERE
  ($name IS NULL OR toLower(r.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
  AND ($origin IS NULL OR r.origin = $origin)
  AND ($culture IS NULL OR r.culture = $culture)
RETURN r
ORDER BY score DESC, r.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const DELETE_RACE = `
MATCH (r:${nodeLabels.race} {id: $id})
WITH r
DETACH DELETE r
RETURN 1 AS deleted
`;

const RACE_PARAMS = [
  "id",
  "name",
  "alias",
  "description",
  "origin",
  "traits",
  "culture",
  "lifespan",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const RACE_UPDATE_PARAMS = RACE_PARAMS.filter((key) => key !== "createdAt");

export const createRace = async (
  data: RaceNode,
  database: string
): Promise<RaceNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, RACE_PARAMS);
    const result = await session.run(CREATE_RACE, params);
    const record = result.records[0];
    const node = record?.get("r");
    return mapNode(node?.properties ?? data) as RaceNode;
  } finally {
    await session.close();
  }
};

export const updateRace = async (
  data: RaceNode,
  database: string
): Promise<RaceNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, RACE_UPDATE_PARAMS);
    const result = await session.run(UPDATE_RACE, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("r");
    return mapNode(node?.properties ?? data) as RaceNode;
  } finally {
    await session.close();
  }
};

export const getRaces = async (
  database: string,
  query: RaceListQuery
): Promise<RaceNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_RACES_BY_SEARCH : GET_RACES;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
      origin: query.origin ?? null,
      culture: query.culture ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("r");
      return mapNode(node?.properties ?? {}) as RaceNode;
    });
  } finally {
    await session.close();
  }
};

export const deleteRace = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_RACE, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};
