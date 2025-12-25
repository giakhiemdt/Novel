import neo4j from "neo4j-driver";
import { getSession } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
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

const GET_ALL_LOCATIONS = `
MATCH (l:${nodeLabels.location})
RETURN l
ORDER BY l.createdAt DESC
`;

const LOCATION_PARAMS = [
  "id",
  "name",
  "alias",
  "type",
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

export const createLocation = async (data: LocationNode): Promise<LocationNode> => {
  const session = getSession(neo4j.session.WRITE);
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

export const getAllLocations = async (): Promise<LocationNode[]> => {
  const session = getSession(neo4j.session.READ);
  try {
    const result = await session.run(GET_ALL_LOCATIONS);
    return result.records.map((record) => {
      const node = record.get("l");
      return mapNode(node?.properties ?? {}) as LocationNode;
    });
  } finally {
    await session.close();
  }
};
