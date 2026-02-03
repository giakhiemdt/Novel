import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { FactionListQuery, FactionNode } from "./faction.types";

const CREATE_FACTION = `
CREATE (f:${nodeLabels.faction} {
  id: $id,
  name: $name,
  alias: $alias,
  type: $type,
  alignment: $alignment,
  isPublic: $isPublic,
  isCanon: $isCanon,
  ideology: $ideology,
  goal: $goal,
  doctrine: $doctrine,
  taboos: $taboos,
  powerLevel: $powerLevel,
  influenceScope: $influenceScope,
  militaryPower: $militaryPower,
  specialAssets: $specialAssets,
  leadershipType: $leadershipType,
  leaderTitle: $leaderTitle,
  hierarchyNote: $hierarchyNote,
  memberPolicy: $memberPolicy,
  foundingStory: $foundingStory,
  ageEstimate: $ageEstimate,
  majorConflicts: $majorConflicts,
  reputation: $reputation,
  currentStatus: $currentStatus,
  currentStrategy: $currentStrategy,
  knownEnemies: $knownEnemies,
  knownAllies: $knownAllies,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN f
`;

const UPDATE_FACTION = `
MATCH (f:${nodeLabels.faction} {id: $id})
SET
  f.name = $name,
  f.alias = $alias,
  f.type = $type,
  f.alignment = $alignment,
  f.isPublic = $isPublic,
  f.isCanon = $isCanon,
  f.ideology = $ideology,
  f.goal = $goal,
  f.doctrine = $doctrine,
  f.taboos = $taboos,
  f.powerLevel = $powerLevel,
  f.influenceScope = $influenceScope,
  f.militaryPower = $militaryPower,
  f.specialAssets = $specialAssets,
  f.leadershipType = $leadershipType,
  f.leaderTitle = $leaderTitle,
  f.hierarchyNote = $hierarchyNote,
  f.memberPolicy = $memberPolicy,
  f.foundingStory = $foundingStory,
  f.ageEstimate = $ageEstimate,
  f.majorConflicts = $majorConflicts,
  f.reputation = $reputation,
  f.currentStatus = $currentStatus,
  f.currentStrategy = $currentStrategy,
  f.knownEnemies = $knownEnemies,
  f.knownAllies = $knownAllies,
  f.notes = $notes,
  f.tags = $tags,
  f.updatedAt = $updatedAt
RETURN f
`;

const GET_FACTIONS = `
MATCH (f:${nodeLabels.faction})
WHERE
  ($name IS NULL OR toLower(f.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(f.tags, []))
  AND ($type IS NULL OR f.type = $type)
  AND ($alignment IS NULL OR f.alignment = $alignment)
  AND ($isPublic IS NULL OR f.isPublic = $isPublic)
  AND ($isCanon IS NULL OR f.isCanon = $isCanon)
RETURN f
ORDER BY f.createdAt DESC
SKIP $offset
LIMIT $limit
`;

const DELETE_FACTION = `
MATCH (f:${nodeLabels.faction} {id: $id})
WITH f
DETACH DELETE f
RETURN 1 AS deleted
`;

const FACTION_PARAMS = [
  "id",
  "name",
  "alias",
  "type",
  "alignment",
  "isPublic",
  "isCanon",
  "ideology",
  "goal",
  "doctrine",
  "taboos",
  "powerLevel",
  "influenceScope",
  "militaryPower",
  "specialAssets",
  "leadershipType",
  "leaderTitle",
  "hierarchyNote",
  "memberPolicy",
  "foundingStory",
  "ageEstimate",
  "majorConflicts",
  "reputation",
  "currentStatus",
  "currentStrategy",
  "knownEnemies",
  "knownAllies",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const FACTION_UPDATE_PARAMS = FACTION_PARAMS.filter(
  (key) => key !== "createdAt"
);

export const createFaction = async (
  data: FactionNode,
  database: string
): Promise<FactionNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, FACTION_PARAMS);
    const result = await session.run(CREATE_FACTION, params);
    const record = result.records[0];
    const node = record?.get("f");
    return mapNode(node?.properties ?? data) as FactionNode;
  } finally {
    await session.close();
  }
};

export const updateFaction = async (
  data: FactionNode,
  database: string
): Promise<FactionNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, FACTION_UPDATE_PARAMS);
    const result = await session.run(UPDATE_FACTION, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("f");
    return mapNode(node?.properties ?? data) as FactionNode;
  } finally {
    await session.close();
  }
};

export const getFactions = async (
  database: string,
  query: FactionListQuery
): Promise<FactionNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_FACTIONS, {
      name: query.name ?? null,
      tag: query.tag ?? null,
      type: query.type ?? null,
      alignment: query.alignment ?? null,
      isPublic: typeof query.isPublic === "boolean" ? query.isPublic : null,
      isCanon: typeof query.isCanon === "boolean" ? query.isCanon : null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("f");
      return mapNode(node?.properties ?? {}) as FactionNode;
    });
  } finally {
    await session.close();
  }
};

export const deleteFaction = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_FACTION, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};
