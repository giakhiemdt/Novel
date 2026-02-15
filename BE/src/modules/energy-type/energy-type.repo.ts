import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { EnergyTypeNode } from "./energy-type.types";

const CREATE_ENERGY_TYPE = `
CREATE (et:${nodeLabels.energyType} {
  id: $id,
  code: $code,
  name: $name,
  description: $description,
  color: $color,
  isActive: $isActive,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN et
`;

const UPDATE_ENERGY_TYPE = `
MATCH (et:${nodeLabels.energyType} {id: $id})
SET
  et.code = $code,
  et.name = $name,
  et.description = $description,
  et.color = $color,
  et.isActive = $isActive,
  et.updatedAt = $updatedAt
RETURN et
`;

const GET_ENERGY_TYPES = `
MATCH (et:${nodeLabels.energyType})
WHERE ($activeOnly = false OR et.isActive = true)
RETURN et
ORDER BY et.name ASC, et.createdAt DESC
`;

const GET_ENERGY_TYPE_BY_ID = `
MATCH (et:${nodeLabels.energyType} {id: $id})
RETURN et
LIMIT 1
`;

const GET_ENERGY_TYPE_BY_CODE = `
MATCH (et:${nodeLabels.energyType} {code: $code})
RETURN et
LIMIT 1
`;

const DELETE_ENERGY_TYPE = `
MATCH (et:${nodeLabels.energyType} {id: $id})
WITH et
DETACH DELETE et
RETURN 1 AS deleted
`;

const ENERGY_TYPE_PARAMS = [
  "id",
  "code",
  "name",
  "description",
  "color",
  "isActive",
  "createdAt",
  "updatedAt",
];

const ENERGY_TYPE_UPDATE_PARAMS = ENERGY_TYPE_PARAMS.filter(
  (key) => key !== "createdAt"
);

export const createEnergyType = async (
  database: string,
  data: EnergyTypeNode
): Promise<EnergyTypeNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, ENERGY_TYPE_PARAMS);
    const result = await session.run(CREATE_ENERGY_TYPE, params);
    const record = result.records[0];
    const node = record?.get("et");
    return mapNode(node?.properties ?? data) as EnergyTypeNode;
  } finally {
    await session.close();
  }
};

export const updateEnergyType = async (
  database: string,
  data: EnergyTypeNode
): Promise<EnergyTypeNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, ENERGY_TYPE_UPDATE_PARAMS);
    const result = await session.run(UPDATE_ENERGY_TYPE, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("et");
    return mapNode(node?.properties ?? data) as EnergyTypeNode;
  } finally {
    await session.close();
  }
};

export const getEnergyTypes = async (
  database: string,
  activeOnly: boolean
): Promise<EnergyTypeNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_ENERGY_TYPES, { activeOnly });
    return result.records.map((record) => {
      const node = record.get("et");
      return mapNode(node?.properties ?? {}) as EnergyTypeNode;
    });
  } finally {
    await session.close();
  }
};

export const getEnergyTypeById = async (
  database: string,
  id: string
): Promise<EnergyTypeNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_ENERGY_TYPE_BY_ID, { id });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("et");
    return mapNode(node?.properties ?? {}) as EnergyTypeNode;
  } finally {
    await session.close();
  }
};

export const getEnergyTypeByCode = async (
  database: string,
  code: string
): Promise<EnergyTypeNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_ENERGY_TYPE_BY_CODE, { code });
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("et");
    return mapNode(node?.properties ?? {}) as EnergyTypeNode;
  } finally {
    await session.close();
  }
};

export const deleteEnergyType = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_ENERGY_TYPE, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

