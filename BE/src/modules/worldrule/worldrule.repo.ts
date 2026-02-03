import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { WorldRuleListQuery, WorldRuleNode } from "./worldrule.types";

const CREATE_RULE = `
CREATE (r:${nodeLabels.worldRule} {
  id: $id,
  title: $title,
  category: $category,
  description: $description,
  scope: $scope,
  constraints: $constraints,
  exceptions: $exceptions,
  status: $status,
  version: $version,
  validFrom: $validFrom,
  validTo: $validTo,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN r
`;

const UPDATE_RULE = `
MATCH (r:${nodeLabels.worldRule} {id: $id})
SET
  r.title = $title,
  r.category = $category,
  r.description = $description,
  r.scope = $scope,
  r.constraints = $constraints,
  r.exceptions = $exceptions,
  r.status = $status,
  r.version = $version,
  r.validFrom = $validFrom,
  r.validTo = $validTo,
  r.notes = $notes,
  r.tags = $tags,
  r.updatedAt = $updatedAt
RETURN r
`;

const GET_RULES = `
MATCH (r:${nodeLabels.worldRule})
WHERE
  ($title IS NULL OR toLower(r.title) CONTAINS toLower($title))
  AND ($category IS NULL OR r.category = $category)
  AND ($status IS NULL OR r.status = $status)
  AND ($scope IS NULL OR r.scope = $scope)
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
RETURN r
ORDER BY r.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const GET_RULES_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("worldrule_search", $q) YIELD node, score
WITH node AS r, score
WHERE
  ($title IS NULL OR toLower(r.title) CONTAINS toLower($title))
  AND ($category IS NULL OR r.category = $category)
  AND ($status IS NULL OR r.status = $status)
  AND ($scope IS NULL OR r.scope = $scope)
  AND ($tag IS NULL OR $tag IN coalesce(r.tags, []))
RETURN r
ORDER BY score DESC, r.createdAt DESC
SKIP toInteger($offset)
LIMIT toInteger($limit)
`;

const DELETE_RULE = `
MATCH (r:${nodeLabels.worldRule} {id: $id})
WITH r
DETACH DELETE r
RETURN 1 AS deleted
`;

const RULE_PARAMS = [
  "id",
  "title",
  "category",
  "description",
  "scope",
  "constraints",
  "exceptions",
  "status",
  "version",
  "validFrom",
  "validTo",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const RULE_UPDATE_PARAMS = RULE_PARAMS.filter((key) => key !== "createdAt");

export const createRule = async (
  data: WorldRuleNode,
  database: string
): Promise<WorldRuleNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, RULE_PARAMS);
    const result = await session.run(CREATE_RULE, params);
    const record = result.records[0];
    const node = record?.get("r");
    return mapNode(node?.properties ?? data) as WorldRuleNode;
  } finally {
    await session.close();
  }
};

export const updateRule = async (
  data: WorldRuleNode,
  database: string
): Promise<WorldRuleNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, RULE_UPDATE_PARAMS);
    const result = await session.run(UPDATE_RULE, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("r");
    return mapNode(node?.properties ?? data) as WorldRuleNode;
  } finally {
    await session.close();
  }
};

export const getRules = async (
  database: string,
  query: WorldRuleListQuery
): Promise<WorldRuleNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_RULES_BY_SEARCH : GET_RULES;
    const result = await session.run(statement, {
      q: query.q ?? "",
      title: query.title ?? null,
      category: query.category ?? null,
      status: query.status ?? null,
      scope: query.scope ?? null,
      tag: query.tag ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("r");
      return mapNode(node?.properties ?? {}) as WorldRuleNode;
    });
  } finally {
    await session.close();
  }
};

export const deleteRule = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_RULE, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};
