import neo4j from "neo4j-driver";
import { getSession } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { OverviewNode } from "./overview.types";

const CREATE_OVERVIEW = `
CREATE (o:${nodeLabels.overview} {
  title: $title,
  subtitle: $subtitle,
  genre: $genre,
  shortSummary: $shortSummary,
  worldOverview: $worldOverview,
  technologyEra: $technologyEra,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN o
`;

const UPDATE_OVERVIEW = `
MATCH (o:${nodeLabels.overview})
SET
  o.title = $title,
  o.subtitle = $subtitle,
  o.genre = $genre,
  o.shortSummary = $shortSummary,
  o.worldOverview = $worldOverview,
  o.technologyEra = $technologyEra,
  o.updatedAt = $updatedAt
RETURN o
`;

const GET_OVERVIEW = `
MATCH (o:${nodeLabels.overview})
RETURN o
LIMIT 1
`;

const OVERVIEW_PARAMS = [
  "title",
  "subtitle",
  "genre",
  "shortSummary",
  "worldOverview",
  "technologyEra",
  "createdAt",
  "updatedAt",
];

export const createOverview = async (
  data: OverviewNode
): Promise<OverviewNode> => {
  const session = getSession(neo4j.session.WRITE);
  try {
    const params = buildParams(data, OVERVIEW_PARAMS);
    const result = await session.run(CREATE_OVERVIEW, params);
    const node = result.records[0]?.get("o");
    return mapNode(node?.properties ?? data) as OverviewNode;
  } finally {
    await session.close();
  }
};

export const updateOverview = async (
  data: OverviewNode
): Promise<OverviewNode> => {
  const session = getSession(neo4j.session.WRITE);
  try {
    const params = buildParams(data, OVERVIEW_PARAMS);
    const result = await session.run(UPDATE_OVERVIEW, params);
    const node = result.records[0]?.get("o");
    return mapNode(node?.properties ?? data) as OverviewNode;
  } finally {
    await session.close();
  }
};

export const getOverview = async (): Promise<OverviewNode | null> => {
  const session = getSession(neo4j.session.READ);
  try {
    const result = await session.run(GET_OVERVIEW);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("o");
    return mapNode(node?.properties ?? {}) as OverviewNode;
  } finally {
    await session.close();
  }
};
