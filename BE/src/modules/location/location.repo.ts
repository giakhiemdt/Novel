import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { LocationListQuery, LocationNode } from "./location.types";

const CREATE_LOCATION = `
CREATE (l:${nodeLabels.location} {
  id: $id,
  name: $name,
  alias: $alias,
  type: $type,
  typeDetail: $typeDetail,
  category: $category,
  isHabitable: $isHabitable,
  isSecret: $isSecret,
  terrain: $terrain,
  climate: $climate,
  environment: $environment,
  naturalResources: $naturalResources,
  powerDensity: $powerDensity,
  dangerLevel: $dangerLevel,
  anomalies: $anomalies,
  restrictions: $restrictions,
  historicalSummary: $historicalSummary,
  legend: $legend,
  ruinsOrigin: $ruinsOrigin,
  currentStatus: $currentStatus,
  controlledBy: $controlledBy,
  populationNote: $populationNote,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN l
`;

const UPDATE_LOCATION = `
MATCH (l:${nodeLabels.location} {id: $id})
SET
  l.name = $name,
  l.alias = $alias,
  l.type = $type,
  l.typeDetail = $typeDetail,
  l.category = $category,
  l.isHabitable = $isHabitable,
  l.isSecret = $isSecret,
  l.terrain = $terrain,
  l.climate = $climate,
  l.environment = $environment,
  l.naturalResources = $naturalResources,
  l.powerDensity = $powerDensity,
  l.dangerLevel = $dangerLevel,
  l.anomalies = $anomalies,
  l.restrictions = $restrictions,
  l.historicalSummary = $historicalSummary,
  l.legend = $legend,
  l.ruinsOrigin = $ruinsOrigin,
  l.currentStatus = $currentStatus,
  l.controlledBy = $controlledBy,
  l.populationNote = $populationNote,
  l.notes = $notes,
  l.tags = $tags,
  l.updatedAt = $updatedAt
RETURN l
`;

const GET_LOCATIONS = `
MATCH (l:${nodeLabels.location})
OPTIONAL MATCH (parent:${nodeLabels.location})-[r:${relationTypes.contains}]->(l)
WHERE
  ($name IS NULL OR toLower(l.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(l.tags, []))
  AND ($type IS NULL OR l.type = $type)
  AND ($category IS NULL OR l.category = $category)
  AND ($isSecret IS NULL OR l.isSecret = $isSecret)
  AND ($isHabitable IS NULL OR l.isHabitable = $isHabitable)
  AND ($parentId IS NULL OR parent.id = $parentId)
RETURN l, parent, r
ORDER BY l.createdAt DESC
SKIP $offset
LIMIT $limit
`;

const GET_LOCATIONS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("location_search", $q) YIELD node, score
WITH node AS l, score
OPTIONAL MATCH (parent:${nodeLabels.location})-[r:${relationTypes.contains}]->(l)
WHERE
  ($name IS NULL OR toLower(l.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(l.tags, []))
  AND ($type IS NULL OR l.type = $type)
  AND ($category IS NULL OR l.category = $category)
  AND ($isSecret IS NULL OR l.isSecret = $isSecret)
  AND ($isHabitable IS NULL OR l.isHabitable = $isHabitable)
  AND ($parentId IS NULL OR parent.id = $parentId)
RETURN l, parent, r
ORDER BY score DESC, l.createdAt DESC
SKIP $offset
LIMIT $limit
`;

const DELETE_LOCATION = `
MATCH (l:${nodeLabels.location} {id: $id})
WITH l
DETACH DELETE l
RETURN 1 AS deleted
`;

const CHECK_LOCATION_EXISTS = `
MATCH (l:${nodeLabels.location} {id: $id})
RETURN l IS NOT NULL AS exists
`;

const CHECK_PARENT_EXISTS = `
MATCH (parent:${nodeLabels.location} {id: $parentId})
RETURN parent IS NOT NULL AS exists
`;

const CHECK_CHILD_PARENT = `
MATCH (parent:${nodeLabels.location})-[r:${relationTypes.contains}]->(child:${nodeLabels.location} {id: $childId})
RETURN count(r) AS parentCount
`;

const CREATE_CONTAINS = `
MATCH (parent:${nodeLabels.location} {id: $parentId})
MATCH (child:${nodeLabels.location} {id: $childId})
MERGE (parent)-[r:${relationTypes.contains}]->(child)
SET
  r.sinceYear = $sinceYear,
  r.untilYear = $untilYear,
  r.note = $note
RETURN r
`;

const DELETE_CONTAINS = `
MATCH (parent:${nodeLabels.location})-[r:${relationTypes.contains}]->(child:${nodeLabels.location} {id: $childId})
WHERE $parentId IS NULL OR parent.id = $parentId
DELETE r
`;

const LOCATION_PARAMS = [
  "id",
  "name",
  "alias",
  "type",
  "typeDetail",
  "category",
  "isHabitable",
  "isSecret",
  "terrain",
  "climate",
  "environment",
  "naturalResources",
  "powerDensity",
  "dangerLevel",
  "anomalies",
  "restrictions",
  "historicalSummary",
  "legend",
  "ruinsOrigin",
  "currentStatus",
  "controlledBy",
  "populationNote",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const LOCATION_UPDATE_PARAMS = LOCATION_PARAMS.filter(
  (key) => key !== "createdAt"
);

export const createLocation = async (
  data: LocationNode,
  database: string
): Promise<LocationNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, LOCATION_PARAMS);
    const result = await session.run(CREATE_LOCATION, params);
    const record = result.records[0];
    const node = record?.get("l");
    return mapNode(node?.properties ?? data) as LocationNode;
  } finally {
    await session.close();
  }
};

export const updateLocation = async (
  data: LocationNode,
  database: string
): Promise<LocationNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, LOCATION_UPDATE_PARAMS);
    const result = await session.run(UPDATE_LOCATION, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("l");
    return mapNode(node?.properties ?? data) as LocationNode;
  } finally {
    await session.close();
  }
};

export const getLocations = async (
  database: string,
  query: LocationListQuery
): Promise<LocationNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_LOCATIONS_BY_SEARCH : GET_LOCATIONS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
      type: query.type ?? null,
      category: query.category ?? null,
      isSecret: typeof query.isSecret === "boolean" ? query.isSecret : null,
      isHabitable:
        typeof query.isHabitable === "boolean" ? query.isHabitable : null,
      parentId: query.parentId ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("l");
      const parent = record.get("parent");
      const relation = record.get("r");
      return {
        ...(mapNode(node?.properties ?? {}) as LocationNode),
        parentId: parent?.properties?.id ?? undefined,
        contains: relation?.properties ?? undefined,
      } as LocationNode;
    });
  } finally {
    await session.close();
  }
};

export const getAllLocations = async (
  database: string
): Promise<LocationNode[]> => {
  return getLocations(database, { limit: 10000, offset: 0 });
};

export const deleteLocation = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_LOCATION, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const createContainsLink = async (
  database: string,
  parentId: string,
  childId: string,
  sinceYear: number | null,
  untilYear: number | null,
  note: string | null
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.executeWrite(async (tx) => {
      const parentCheck = await tx.run(CHECK_PARENT_EXISTS, { parentId });
      const parentExists = parentCheck.records[0]?.get("exists") as
        | boolean
        | undefined;
      if (!parentExists) {
        throw new Error("PARENT location not found");
      }

      const childCheck = await tx.run(CHECK_LOCATION_EXISTS, { id: childId });
      const childExists = childCheck.records[0]?.get("exists") as
        | boolean
        | undefined;
      if (!childExists) {
        throw new Error("CHILD location not found");
      }

      const parentCountResult = await tx.run(CHECK_CHILD_PARENT, { childId });
      const parentCount = parentCountResult.records[0]?.get("parentCount");
      if (parentCount && parentCount.toNumber() > 0) {
        throw new Error("CHILD already has parent");
      }

      await tx.run(CREATE_CONTAINS, {
        parentId,
        childId,
        sinceYear,
        untilYear,
        note,
      });
    });
  } finally {
    await session.close();
  }
};

export const deleteContainsLink = async (
  database: string,
  childId: string,
  parentId?: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(DELETE_CONTAINS, {
      childId,
      parentId: parentId ?? null,
    });
  } finally {
    await session.close();
  }
};
