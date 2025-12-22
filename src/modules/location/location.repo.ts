import neo4j from "neo4j-driver";
import { getSession } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { mapNode } from "../../shared/utils/map-node";
import { LocationNode } from "./location.types";

const CREATE_LOCATION = `
CREATE (l:${nodeLabels.location} {
  id: $id,
  name: $name,
  alias: $alias,
  type: $type,
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

export const createLocation = async (data: LocationNode): Promise<LocationNode> => {
  const session = getSession(neo4j.session.WRITE);
  try {
    const params = Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, value ?? null])
    );
    const result = await session.run(CREATE_LOCATION, params);
    const record = result.records[0];
    const node = record?.get("l");
    return mapNode(node?.properties ?? data) as LocationNode;
  } finally {
    await session.close();
  }
};
