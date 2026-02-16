import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import {
  EnergyTierLinkInput,
  EnergyTierLinkNode,
  EnergyTierNode,
} from "./energy-tier.types";

const CREATE_ENERGY_TIER = `
MATCH (et:${nodeLabels.energyType} {id: $energyTypeId})
CREATE (tier:${nodeLabels.energyTier} {
  id: $id,
  energyTypeId: $energyTypeId,
  code: $code,
  name: $name,
  level: $level,
  description: $description,
  color: $color,
  isActive: $isActive,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
MERGE (et)-[:${relationTypes.hasEnergyTier}]->(tier)
RETURN tier { .*, energyTypeName: et.name } AS tier
`;

const UPDATE_ENERGY_TIER = `
MATCH (tier:${nodeLabels.energyTier} {id: $id})
SET
  tier.energyTypeId = $energyTypeId,
  tier.code = $code,
  tier.name = $name,
  tier.level = $level,
  tier.description = $description,
  tier.color = $color,
  tier.isActive = $isActive,
  tier.updatedAt = $updatedAt
WITH tier
OPTIONAL MATCH (:${nodeLabels.energyType})-[old:${relationTypes.hasEnergyTier}]->(tier)
DELETE old
WITH tier
OPTIONAL MATCH (et:${nodeLabels.energyType} {id: $energyTypeId})
FOREACH (_ IN CASE WHEN et IS NULL THEN [] ELSE [1] END |
  MERGE (et)-[:${relationTypes.hasEnergyTier}]->(tier)
)
RETURN tier { .*, energyTypeName: et.name } AS tier
`;

const GET_ENERGY_TIERS = `
MATCH (tier:${nodeLabels.energyTier})
OPTIONAL MATCH (et:${nodeLabels.energyType})-[:${relationTypes.hasEnergyTier}]->(tier)
WHERE ($activeOnly = false OR tier.isActive = true)
  AND ($energyTypeId IS NULL OR et.id = $energyTypeId)
RETURN tier { .*, energyTypeName: et.name } AS tier
ORDER BY coalesce(tier.level, 999999) ASC, tier.name ASC, tier.createdAt DESC
`;

const GET_ENERGY_TIER_BY_ID = `
MATCH (tier:${nodeLabels.energyTier} {id: $id})
OPTIONAL MATCH (et:${nodeLabels.energyType})-[:${relationTypes.hasEnergyTier}]->(tier)
RETURN tier { .*, energyTypeName: et.name } AS tier
LIMIT 1
`;

const GET_ENERGY_TIER_BY_CODE = `
MATCH (tier:${nodeLabels.energyTier} {code: $code})
RETURN tier
LIMIT 1
`;

const DELETE_ENERGY_TIER = `
MATCH (tier:${nodeLabels.energyTier} {id: $id})
WITH tier
DETACH DELETE tier
RETURN 1 AS deleted
`;

const LINK_ENERGY_TIERS = `
MATCH (prev:${nodeLabels.energyTier} {id: $previousId})
MATCH (current:${nodeLabels.energyTier} {id: $currentId})
MERGE (prev)-[rel:${relationTypes.energyNext}]->(current)
SET
  rel.requiredAmount = $requiredAmount,
  rel.efficiency = $efficiency,
  rel.condition = $condition,
  rel.updatedAt = $updatedAt
RETURN rel
`;

const UNLINK_ENERGY_TIERS = `
MATCH (prev:${nodeLabels.energyTier} {id: $previousId})-[rel:${relationTypes.energyNext}]->(current:${nodeLabels.energyTier} {id: $currentId})
DELETE rel
RETURN 1 AS deleted
`;

const GET_ENERGY_TIER_LINK = `
MATCH (prev:${nodeLabels.energyTier} {id: $previousId})-[rel:${relationTypes.energyNext}]->(current:${nodeLabels.energyTier} {id: $currentId})
RETURN {
  previousId: prev.id,
  currentId: current.id,
  requiredAmount: rel.requiredAmount,
  efficiency: rel.efficiency,
  condition: rel.condition,
  updatedAt: rel.updatedAt
} AS link
LIMIT 1
`;

const GET_ENERGY_TIER_LINKS = `
MATCH (prev:${nodeLabels.energyTier})-[rel:${relationTypes.energyNext}]->(current:${nodeLabels.energyTier})
RETURN {
  previousId: prev.id,
  currentId: current.id,
  requiredAmount: rel.requiredAmount,
  efficiency: rel.efficiency,
  condition: rel.condition,
  updatedAt: rel.updatedAt
} AS link
ORDER BY prev.name ASC, current.name ASC
`;

const ENERGY_TIER_PARAMS = [
  "id",
  "energyTypeId",
  "code",
  "name",
  "level",
  "description",
  "color",
  "isActive",
  "createdAt",
  "updatedAt",
];

const ENERGY_TIER_UPDATE_PARAMS = ENERGY_TIER_PARAMS.filter(
  (key) => key !== "createdAt"
);

export const createEnergyTier = async (
  database: string,
  data: EnergyTierNode
): Promise<EnergyTierNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, ENERGY_TIER_PARAMS);
    const result = await session.run(CREATE_ENERGY_TIER, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("tier");
    return mapNode(node ?? data) as EnergyTierNode;
  } finally {
    await session.close();
  }
};

export const updateEnergyTier = async (
  database: string,
  data: EnergyTierNode
): Promise<EnergyTierNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, ENERGY_TIER_UPDATE_PARAMS);
    const result = await session.run(UPDATE_ENERGY_TIER, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("tier");
    return mapNode(node ?? data) as EnergyTierNode;
  } finally {
    await session.close();
  }
};

export const getEnergyTiers = async (
  database: string,
  activeOnly: boolean,
  energyTypeId?: string
): Promise<EnergyTierNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_ENERGY_TIERS, {
      activeOnly,
      energyTypeId: energyTypeId ?? null,
    });
    return result.records.map((record) => {
      const node = record.get("tier");
      return mapNode(node ?? {}) as EnergyTierNode;
    });
  } finally {
    await session.close();
  }
};

export const getEnergyTierById = async (
  database: string,
  id: string
): Promise<EnergyTierNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_ENERGY_TIER_BY_ID, { id });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("tier");
    return mapNode(node ?? {}) as EnergyTierNode;
  } finally {
    await session.close();
  }
};

export const getEnergyTierByCode = async (
  database: string,
  code: string
): Promise<EnergyTierNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_ENERGY_TIER_BY_CODE, { code });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("tier");
    return mapNode(node?.properties ?? {}) as EnergyTierNode;
  } finally {
    await session.close();
  }
};

export const deleteEnergyTier = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_ENERGY_TIER, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const linkEnergyTiers = async (
  database: string,
  input: EnergyTierLinkInput & { updatedAt: string }
): Promise<EnergyTierLinkNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(LINK_ENERGY_TIERS, {
      previousId: input.previousId,
      currentId: input.currentId,
      requiredAmount: input.requiredAmount ?? null,
      efficiency: input.efficiency ?? null,
      condition: input.condition ?? null,
      updatedAt: input.updatedAt,
    });
    const result = await session.run(GET_ENERGY_TIER_LINK, {
      previousId: input.previousId,
      currentId: input.currentId,
    });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    return mapNode(record.get("link") ?? {}) as EnergyTierLinkNode;
  } finally {
    await session.close();
  }
};

export const unlinkEnergyTiers = async (
  database: string,
  previousId: string,
  currentId: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(UNLINK_ENERGY_TIERS, {
      previousId,
      currentId,
    });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const getEnergyTierLinks = async (
  database: string
): Promise<EnergyTierLinkNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_ENERGY_TIER_LINKS);
    return result.records.map((record) =>
      mapNode(record.get("link") ?? {})
    ) as EnergyTierLinkNode[];
  } finally {
    await session.close();
  }
};
