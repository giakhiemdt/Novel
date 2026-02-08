import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { MapSystemListQuery, MapSystemNode } from "./map-system.types";

const CREATE_MAP_SYSTEM = `
CREATE (ms:${nodeLabels.mapSystem} {
  id: $id,
  name: $name,
  code: $code,
  description: $description,
  scope: $scope,
  seed: $seed,
  width: $width,
  height: $height,
  seaLevel: $seaLevel,
  climatePreset: $climatePreset,
  config: $config,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN ms
`;

const UPDATE_MAP_SYSTEM = `
MATCH (ms:${nodeLabels.mapSystem} {id: $id})
SET
  ms.name = $name,
  ms.code = $code,
  ms.description = $description,
  ms.scope = $scope,
  ms.seed = $seed,
  ms.width = $width,
  ms.height = $height,
  ms.seaLevel = $seaLevel,
  ms.climatePreset = $climatePreset,
  ms.config = $config,
  ms.notes = $notes,
  ms.tags = $tags,
  ms.updatedAt = $updatedAt
RETURN ms
`;

const GET_MAP_SYSTEMS = `
MATCH (ms:${nodeLabels.mapSystem})
WHERE
  ($name IS NULL OR toLower(ms.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(ms.code) CONTAINS toLower($code))
  AND ($scope IS NULL OR ms.scope = $scope)
RETURN ms
ORDER BY ms.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_MAP_SYSTEMS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("map_system_search", $q) YIELD node, score
WITH node AS ms, score
WHERE
  ($name IS NULL OR toLower(ms.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(ms.code) CONTAINS toLower($code))
  AND ($scope IS NULL OR ms.scope = $scope)
RETURN ms
ORDER BY score DESC, ms.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const COUNT_MAP_SYSTEMS = `
MATCH (ms:${nodeLabels.mapSystem})
WHERE
  ($name IS NULL OR toLower(ms.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(ms.code) CONTAINS toLower($code))
  AND ($scope IS NULL OR ms.scope = $scope)
RETURN count(ms) AS total
`;

const COUNT_MAP_SYSTEMS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("map_system_search", $q) YIELD node, score
WITH node AS ms, score
WHERE
  ($name IS NULL OR toLower(ms.name) CONTAINS toLower($name))
  AND ($code IS NULL OR toLower(ms.code) CONTAINS toLower($code))
  AND ($scope IS NULL OR ms.scope = $scope)
RETURN count(ms) AS total
`;

const DELETE_MAP_SYSTEM = `
MATCH (ms:${nodeLabels.mapSystem} {id: $id})
WITH ms
DETACH DELETE ms
RETURN 1 AS deleted
`;

const MAP_SYSTEM_PARAMS = [
  "id",
  "name",
  "code",
  "description",
  "scope",
  "seed",
  "width",
  "height",
  "seaLevel",
  "climatePreset",
  "config",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const MAP_SYSTEM_UPDATE_PARAMS = MAP_SYSTEM_PARAMS.filter(
  (key) => key !== "createdAt"
);

export const createMapSystem = async (
  data: MapSystemNode,
  database: string
): Promise<MapSystemNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, MAP_SYSTEM_PARAMS);
    const result = await session.run(CREATE_MAP_SYSTEM, params);
    const record = result.records[0];
    const node = record?.get("ms");
    return mapNode(node?.properties ?? data) as MapSystemNode;
  } finally {
    await session.close();
  }
};

export const updateMapSystem = async (
  data: MapSystemNode,
  database: string
): Promise<MapSystemNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, MAP_SYSTEM_UPDATE_PARAMS);
    const result = await session.run(UPDATE_MAP_SYSTEM, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("ms");
    return mapNode(node?.properties ?? data) as MapSystemNode;
  } finally {
    await session.close();
  }
};

export const getMapSystems = async (
  database: string,
  query: MapSystemListQuery
): Promise<MapSystemNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_MAP_SYSTEMS_BY_SEARCH : GET_MAP_SYSTEMS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      code: query.code ?? null,
      scope: query.scope ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("ms");
      return mapNode(node?.properties ?? {}) as MapSystemNode;
    });
  } finally {
    await session.close();
  }
};

export const getMapSystemCount = async (
  database: string,
  query: MapSystemListQuery
): Promise<number> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? COUNT_MAP_SYSTEMS_BY_SEARCH : COUNT_MAP_SYSTEMS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      code: query.code ?? null,
      scope: query.scope ?? null,
    });
    const total = result.records[0]?.get("total");
    if (neo4j.isInt(total)) {
      return total.toNumber();
    }
    return typeof total === "number" ? total : 0;
  } finally {
    await session.close();
  }
};

export const deleteMapSystem = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_MAP_SYSTEM, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};
