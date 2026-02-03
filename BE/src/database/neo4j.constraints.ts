import neo4j from "neo4j-driver";
import { getSessionForDatabase } from "./neo4j.session";

const constraintStatements = [
  "CREATE CONSTRAINT project_id_unique IF NOT EXISTS FOR (n:Project) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT project_name_unique IF NOT EXISTS FOR (n:Project) REQUIRE n.name IS UNIQUE",
  "CREATE CONSTRAINT character_id_unique IF NOT EXISTS FOR (n:Character) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT character_name_unique IF NOT EXISTS FOR (n:Character) REQUIRE n.name IS UNIQUE",
  "CREATE CONSTRAINT timeline_id_unique IF NOT EXISTS FOR (n:Timeline) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT timeline_name_unique IF NOT EXISTS FOR (n:Timeline) REQUIRE n.name IS UNIQUE",
  "CREATE CONSTRAINT location_id_unique IF NOT EXISTS FOR (n:Location) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT location_name_unique IF NOT EXISTS FOR (n:Location) REQUIRE n.name IS UNIQUE",
  "CREATE CONSTRAINT faction_id_unique IF NOT EXISTS FOR (n:Faction) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT faction_name_unique IF NOT EXISTS FOR (n:Faction) REQUIRE n.name IS UNIQUE",
  "CREATE CONSTRAINT event_id_unique IF NOT EXISTS FOR (n:Event) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT event_name_unique IF NOT EXISTS FOR (n:Event) REQUIRE n.name IS UNIQUE",
  "CREATE CONSTRAINT overview_title_unique IF NOT EXISTS FOR (n:Overview) REQUIRE n.title IS UNIQUE",
];

export const ensureConstraintsForDatabase = async (
  database: string
): Promise<void> => {
  const session = getSessionForDatabase(database, neo4j.session.WRITE);
  try {
    for (const statement of constraintStatements) {
      await session.run(statement);
    }
  } finally {
    await session.close();
  }
};
