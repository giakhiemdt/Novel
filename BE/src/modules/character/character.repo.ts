import neo4j from "neo4j-driver";
import { getSession } from "../../database";
import { nodeLabels } from "../../shared/constants/node-labels";
import { buildParams } from "../../shared/utils/build-params";
import { mapNode } from "../../shared/utils/map-node";
import { CharacterNode } from "./character.types";

const CREATE_CHARACTER = `
CREATE (c:${nodeLabels.character} {
  id: $id,
  name: $name,
  alias: $alias,
  soulArt: $soulArt,
  level: $level,
  status: $status,
  isMainCharacter: $isMainCharacter,
  gender: $gender,
  age: $age,
  race: $race,
  appearance: $appearance,
  height: $height,
  distinctiveTraits: $distinctiveTraits,
  personalityTraits: $personalityTraits,
  beliefs: $beliefs,
  fears: $fears,
  desires: $desires,
  weaknesses: $weaknesses,
  origin: $origin,
  background: $background,
  trauma: $trauma,
  secret: $secret,
  currentLocation: $currentLocation,
  currentGoal: $currentGoal,
  currentAffiliation: $currentAffiliation,
  powerState: $powerState,
  notes: $notes,
  tags: $tags,
  createdAt: $createdAt,
  updatedAt: $updatedAt
})
RETURN c
`;

const CHARACTER_PARAMS = [
  "id",
  "name",
  "alias",
  "soulArt",
  "level",
  "status",
  "isMainCharacter",
  "gender",
  "age",
  "race",
  "appearance",
  "height",
  "distinctiveTraits",
  "personalityTraits",
  "beliefs",
  "fears",
  "desires",
  "weaknesses",
  "origin",
  "background",
  "trauma",
  "secret",
  "currentLocation",
  "currentGoal",
  "currentAffiliation",
  "powerState",
  "notes",
  "tags",
  "createdAt",
  "updatedAt",
];

export const createCharacter = async (
  data: CharacterNode
): Promise<CharacterNode> => {
  const session = getSession(neo4j.session.WRITE);
  try {
    const params = buildParams(data, CHARACTER_PARAMS);
    const result = await session.run(CREATE_CHARACTER, params);
    const record = result.records[0];
    const node = record?.get("c");
    return mapNode(node?.properties ?? data) as CharacterNode;
  } finally {
    await session.close();
  }
};
