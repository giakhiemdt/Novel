import neo4j from "neo4j-driver";
import { getSession } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
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

export const createFaction = async (data: FactionNode): Promise<FactionNode> => {
  const session = getSession(neo4j.session.WRITE);
  try {
    const params = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value ?? null])
    );
    const result = await session.run(CREATE_FACTION, params);
    const record = result.records[0];
    const node = record?.get("f");
    return mapNode(node?.properties ?? data) as FactionNode;
  } finally {
    await session.close();
  }
};
