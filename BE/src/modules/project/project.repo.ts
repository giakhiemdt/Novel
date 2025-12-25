import neo4j from "neo4j-driver";
import { getSession, getSystemSession } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { ProjectNode } from "./project.types";

const CREATE_PROJECT = `
CREATE (p:${nodeLabels.project} {
  id: $id,
  name: $name,
  description: $description,
  dbName: $dbName,
  status: $status,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN p
`;

const GET_ALL_PROJECTS = `
MATCH (p:${nodeLabels.project})
RETURN p
ORDER BY p.createdAt DESC
`;

const PROJECT_PARAMS = [
  "id",
  "name",
  "description",
  "dbName",
  "status",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

export const createProject = async (
  data: ProjectNode
): Promise<ProjectNode> => {
  const session = getSession(neo4j.session.WRITE);
  try {
    const params = buildParams(data, PROJECT_PARAMS);
    const result = await session.run(CREATE_PROJECT, params);
    const record = result.records[0];
    const node = record?.get("p");
    return mapNode(node?.properties ?? data) as ProjectNode;
  } finally {
    await session.close();
  }
};

export const getAllProjects = async (): Promise<ProjectNode[]> => {
  const session = getSession(neo4j.session.READ);
  try {
    const result = await session.run(GET_ALL_PROJECTS);
    return result.records.map((record) => {
      const node = record.get("p");
      return mapNode(node?.properties ?? {}) as ProjectNode;
    });
  } finally {
    await session.close();
  }
};

export const createProjectDatabase = async (
  databaseIdentifier: string
): Promise<void> => {
  const session = getSystemSession(neo4j.session.WRITE);
  try {
    await session.run(`CREATE DATABASE ${databaseIdentifier} IF NOT EXISTS`);
  } finally {
    await session.close();
  }
};

export const dropProjectDatabase = async (
  databaseIdentifier: string
): Promise<void> => {
  const session = getSystemSession(neo4j.session.WRITE);
  try {
    await session.run(`DROP DATABASE ${databaseIdentifier} IF EXISTS`);
  } finally {
    await session.close();
  }
};
