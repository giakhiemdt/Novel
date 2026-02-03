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
  "CREATE CONSTRAINT arc_id_unique IF NOT EXISTS FOR (n:Arc) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT arc_name_unique IF NOT EXISTS FOR (n:Arc) REQUIRE n.name IS UNIQUE",
  "CREATE CONSTRAINT chapter_id_unique IF NOT EXISTS FOR (n:Chapter) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT chapter_name_unique IF NOT EXISTS FOR (n:Chapter) REQUIRE n.name IS UNIQUE",
  "CREATE CONSTRAINT scene_id_unique IF NOT EXISTS FOR (n:Scene) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT scene_name_unique IF NOT EXISTS FOR (n:Scene) REQUIRE n.name IS UNIQUE",
  "CREATE CONSTRAINT item_id_unique IF NOT EXISTS FOR (n:Item) REQUIRE n.id IS UNIQUE",
  "CREATE CONSTRAINT item_name_unique IF NOT EXISTS FOR (n:Item) REQUIRE n.name IS UNIQUE",
  "CREATE FULLTEXT INDEX character_search IF NOT EXISTS FOR (n:Character) ON EACH [n.name, n.alias, n.background, n.appearance, n.notes]",
  "CREATE FULLTEXT INDEX event_search IF NOT EXISTS FOR (n:Event) ON EACH [n.name, n.summary, n.description, n.notes]",
  "CREATE FULLTEXT INDEX location_search IF NOT EXISTS FOR (n:Location) ON EACH [n.name, n.historicalSummary, n.legend, n.notes]",
  "CREATE FULLTEXT INDEX faction_search IF NOT EXISTS FOR (n:Faction) ON EACH [n.name, n.ideology, n.goal, n.reputation, n.notes]",
  "CREATE FULLTEXT INDEX timeline_search IF NOT EXISTS FOR (n:Timeline) ON EACH [n.name, n.summary, n.description, n.notes]",
  "CREATE FULLTEXT INDEX project_search IF NOT EXISTS FOR (n:Project) ON EACH [n.name, n.description, n.notes]",
  "CREATE FULLTEXT INDEX overview_search IF NOT EXISTS FOR (n:Overview) ON EACH [n.title, n.shortSummary, n.worldOverview]",
  "CREATE FULLTEXT INDEX arc_search IF NOT EXISTS FOR (n:Arc) ON EACH [n.name, n.summary, n.notes]",
  "CREATE FULLTEXT INDEX chapter_search IF NOT EXISTS FOR (n:Chapter) ON EACH [n.name, n.summary, n.notes]",
  "CREATE FULLTEXT INDEX scene_search IF NOT EXISTS FOR (n:Scene) ON EACH [n.name, n.summary, n.content, n.notes]",
  "CREATE FULLTEXT INDEX item_search IF NOT EXISTS FOR (n:Item) ON EACH [n.name, n.origin, n.powerDescription, n.notes]",
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
