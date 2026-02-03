import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { relationTypes } from "../../shared/constants/relation-types";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { ItemListQuery, ItemNode } from "./item.types";

const CREATE_ITEM = `
CREATE (i:${nodeLabels.item} {
  id: $id,
  name: $name,
  origin: $origin,
  ownerId: $ownerId,
  ownerType: $ownerType,
  status: $status,
  powerLevel: $powerLevel,
  powerDescription: $powerDescription,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN i
`;

const UPDATE_ITEM = `
MATCH (i:${nodeLabels.item} {id: $id})
SET
  i.name = $name,
  i.origin = $origin,
  i.ownerId = $ownerId,
  i.ownerType = $ownerType,
  i.status = $status,
  i.powerLevel = $powerLevel,
  i.powerDescription = $powerDescription,
  i.notes = $notes,
  i.tags = $tags,
  i.updatedAt = $updatedAt
RETURN i
`;

const GET_ITEMS = `
MATCH (i:${nodeLabels.item})
WHERE
  ($name IS NULL OR toLower(i.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(i.tags, []))
  AND ($status IS NULL OR i.status = $status)
  AND ($ownerId IS NULL OR i.ownerId = $ownerId)
  AND ($ownerType IS NULL OR i.ownerType = $ownerType)
RETURN i
ORDER BY i.createdAt DESC
SKIP $offset
LIMIT $limit
`;

const GET_ITEMS_BY_SEARCH = `
CALL db.index.fulltext.queryNodes("item_search", $q) YIELD node, score
WITH node AS i, score
WHERE
  ($name IS NULL OR toLower(i.name) CONTAINS toLower($name))
  AND ($tag IS NULL OR $tag IN coalesce(i.tags, []))
  AND ($status IS NULL OR i.status = $status)
  AND ($ownerId IS NULL OR i.ownerId = $ownerId)
  AND ($ownerType IS NULL OR i.ownerType = $ownerType)
RETURN i
ORDER BY score DESC, i.createdAt DESC
SKIP $offset
LIMIT $limit
`;

const DELETE_ITEM = `
MATCH (i:${nodeLabels.item} {id: $id})
WITH i
DETACH DELETE i
RETURN 1 AS deleted
`;

const CHECK_CHARACTER = `
MATCH (c:${nodeLabels.character} {id: $id})
RETURN c IS NOT NULL AS exists
`;

const CHECK_FACTION = `
MATCH (f:${nodeLabels.faction} {id: $id})
RETURN f IS NOT NULL AS exists
`;

const CHECK_ITEM = `
MATCH (i:${nodeLabels.item} {id: $id})
RETURN i IS NOT NULL AS exists
`;

const CHECK_EVENT = `
MATCH (e:${nodeLabels.event} {id: $id})
RETURN e IS NOT NULL AS exists
`;

const LINK_OWNER_CHARACTER = `
MATCH (c:${nodeLabels.character} {id: $ownerId})
MATCH (i:${nodeLabels.item} {id: $itemId})
MERGE (c)-[:${relationTypes.ownsItem}]->(i)
`;

const LINK_OWNER_FACTION = `
MATCH (f:${nodeLabels.faction} {id: $ownerId})
MATCH (i:${nodeLabels.item} {id: $itemId})
MERGE (f)-[:${relationTypes.ownsItem}]->(i)
`;

const UNLINK_OWNERS = `
MATCH (:${nodeLabels.character})-[r:${relationTypes.ownsItem}]->(i:${nodeLabels.item} {id: $itemId})
DELETE r
WITH i
MATCH (:${nodeLabels.faction})-[r2:${relationTypes.ownsItem}]->(i)
DELETE r2
`;

const LINK_ITEM_EVENT = `
MATCH (i:${nodeLabels.item} {id: $itemId})
MATCH (e:${nodeLabels.event} {id: $eventId})
MERGE (i)-[:${relationTypes.itemAppearsIn}]->(e)
`;

const UNLINK_ITEM_EVENT = `
MATCH (i:${nodeLabels.item} {id: $itemId})-[r:${relationTypes.itemAppearsIn}]->(:${nodeLabels.event})
DELETE r
`;

const GET_ITEMS_BY_EVENT = `
MATCH (i:${nodeLabels.item})-[:${relationTypes.itemAppearsIn}]->(e:${nodeLabels.event} {id: $eventId})
RETURN i
ORDER BY i.createdAt DESC
`;

const GET_EVENTS_BY_ITEM = `
MATCH (i:${nodeLabels.item} {id: $itemId})-[:${relationTypes.itemAppearsIn}]->(e:${nodeLabels.event})
RETURN e
ORDER BY e.createdAt DESC
`;

const ITEM_PARAMS = [
  "id",
  "name",
  "origin",
  "ownerId",
  "ownerType",
  "status",
  "powerLevel",
  "powerDescription",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

const ITEM_UPDATE_PARAMS = ITEM_PARAMS.filter((key) => key !== "createdAt");

export const createItem = async (
  data: ItemNode,
  database: string
): Promise<ItemNode> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, ITEM_PARAMS);
    const result = await session.run(CREATE_ITEM, params);
    const record = result.records[0];
    const node = record?.get("i");
    return mapNode(node?.properties ?? data) as ItemNode;
  } finally {
    await session.close();
  }
};

export const updateItem = async (
  data: ItemNode,
  database: string
): Promise<ItemNode | null> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const params = buildParams(data, ITEM_UPDATE_PARAMS);
    const result = await session.run(UPDATE_ITEM, params);
    const record = result.records[0];
    if (!record) {
      return null;
    }
    const node = record.get("i");
    return mapNode(node?.properties ?? data) as ItemNode;
  } finally {
    await session.close();
  }
};

export const getItems = async (
  database: string,
  query: ItemListQuery
): Promise<ItemNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const statement = query.q ? GET_ITEMS_BY_SEARCH : GET_ITEMS;
    const result = await session.run(statement, {
      q: query.q ?? "",
      name: query.name ?? null,
      tag: query.tag ?? null,
      status: query.status ?? null,
      ownerId: query.ownerId ?? null,
      ownerType: query.ownerType ?? null,
      offset: query.offset ?? 0,
      limit: query.limit ?? 50,
    });
    return result.records.map((record) => {
      const node = record.get("i");
      return mapNode(node?.properties ?? {}) as ItemNode;
    });
  } finally {
    await session.close();
  }
};

export const deleteItem = async (
  database: string,
  id: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const result = await session.run(DELETE_ITEM, { id });
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

export const checkOwnerExists = async (
  database: string,
  ownerType: "character" | "faction",
  ownerId: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const query = ownerType === "character" ? CHECK_CHARACTER : CHECK_FACTION;
    const result = await session.run(query, { id: ownerId });
    return (result.records[0]?.get("exists") as boolean | undefined) ?? false;
  } finally {
    await session.close();
  }
};

export const checkItemExists = async (
  database: string,
  itemId: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHECK_ITEM, { id: itemId });
    return (result.records[0]?.get("exists") as boolean | undefined) ?? false;
  } finally {
    await session.close();
  }
};

export const checkEventExists = async (
  database: string,
  eventId: string
): Promise<boolean> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(CHECK_EVENT, { id: eventId });
    return (result.records[0]?.get("exists") as boolean | undefined) ?? false;
  } finally {
    await session.close();
  }
};

export const linkOwner = async (
  database: string,
  itemId: string,
  ownerType: "character" | "faction",
  ownerId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    const query = ownerType === "character" ? LINK_OWNER_CHARACTER : LINK_OWNER_FACTION;
    await session.run(query, { itemId, ownerId });
  } finally {
    await session.close();
  }
};

export const unlinkOwners = async (
  database: string,
  itemId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(UNLINK_OWNERS, { itemId });
  } finally {
    await session.close();
  }
};

export const linkItemEvent = async (
  database: string,
  itemId: string,
  eventId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(LINK_ITEM_EVENT, { itemId, eventId });
  } finally {
    await session.close();
  }
};

export const unlinkItemEvent = async (
  database: string,
  itemId: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    await session.run(UNLINK_ITEM_EVENT, { itemId });
  } finally {
    await session.close();
  }
};

export const getItemsByEvent = async (
  database: string,
  eventId: string
): Promise<ItemNode[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_ITEMS_BY_EVENT, { eventId });
    return result.records.map((record) => {
      const node = record.get("i");
      return mapNode(node?.properties ?? {}) as ItemNode;
    });
  } finally {
    await session.close();
  }
};

export const getEventsByItem = async (
  database: string,
  itemId: string
): Promise<Record<string, unknown>[]> => {
  const session = getSessionForDatabase(database, neo4j.session.READ);
  try {
    const result = await session.run(GET_EVENTS_BY_ITEM, { itemId });
    return result.records.map((record) => {
      const node = record.get("e");
      return mapNode(node?.properties ?? {}) as Record<string, unknown>;
    });
  } finally {
    await session.close();
  }
};
