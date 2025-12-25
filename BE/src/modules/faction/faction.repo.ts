import neo4j from "neo4j-driver";
import { getSession } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { FactionNode } from "./faction.types";

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

const GET_ALL_FACTIONS = `
MATCH (f:${nodeLabels.faction})
RETURN f
ORDER BY f.createdAt DESC
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

export const createFaction = async (data: FactionNode): Promise<FactionNode> => {
  const session = getSession(neo4j.session.WRITE);
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

export const getAllFactions = async (): Promise<FactionNode[]> => {
  const session = getSession(neo4j.session.READ);
  try {
    const result = await session.run(GET_ALL_FACTIONS);
    return result.records.map((record) => {
      const node = record.get("f");
      return mapNode(node?.properties ?? {}) as FactionNode;
    });
  } finally {
    await session.close();
  }
};
