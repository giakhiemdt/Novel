import { ensureConstraintsForDatabase, getSessionForDatabase } from "../../database";
import neo4j from "neo4j-driver";
import { overviewService } from "../../modules/overview/overview.service";
import { raceService } from "../../modules/race/race.service";
import { rankService } from "../../modules/rank/rank.service";
import { specialAbilityService } from "../../modules/special-ability/special-ability.service";
import { locationService } from "../../modules/location/location.service";
import { factionService } from "../../modules/faction/faction.service";
import { timelineService } from "../../modules/timeline/timeline.service";
import { eventService } from "../../modules/event/event.service";
import { arcService } from "../../modules/arc/arc.service";
import { chapterService } from "../../modules/chapter/chapter.service";
import { sceneService } from "../../modules/scene/scene.service";
import { itemService } from "../../modules/item/item.service";
import { relationshipService } from "../../modules/relationship/relationship.service";
import { worldRuleService } from "../../modules/worldrule/worldrule.service";
import { characterService } from "../../modules/character/character.service";
import type { CharacterNode } from "../../modules/character/character.types";
import type { LocationNode } from "../../modules/location/location.types";
import type { FactionNode } from "../../modules/faction/faction.types";
import type { EventNode } from "../../modules/event/event.types";
import { generateId } from "../../shared/utils/generate-id";
import { buildParams } from "../../shared/utils/build-params";

const DB_NAME = "datainit";
const SEED_PREFIX = "DI";
const SEED_MARKER = `${SEED_PREFIX}-`;

const pick = <T>(arr: readonly T[], index: number): T =>
  arr[index % arr.length] as T;

const buildName = (prefix: string, index: number) => `${prefix} ${index + 1}`;
const seedName = (name: string) => `${SEED_PREFIX}-${name}`;

const cleanupSeedData = async () => {
  const session = getSessionForDatabase(DB_NAME, neo4j.session.WRITE);
  try {
    await session.run(
      `MATCH (n)
       WHERE (n.name IS NOT NULL AND n.name STARTS WITH $prefix)
          OR (n.title IS NOT NULL AND n.title STARTS WITH $prefix)
       DETACH DELETE n`,
      { prefix: SEED_MARKER }
    );
    const check = await session.run(
      `MATCH (l:Location)
       WHERE l.name STARTS WITH $prefix
       RETURN count(l) AS total, collect(l.name)[0..5] AS samples`,
      { prefix: SEED_MARKER }
    );
    const record = check.records[0];
    const total = record?.get("total")?.toNumber?.() ?? 0;
    const samples = record?.get("samples") ?? [];
    if (total > 0) {
      console.warn(
        `Seed cleanup: còn ${total} Location có prefix '${SEED_MARKER}', mẫu: ${samples.join(
          ", "
        )}`
      );
    }
  } finally {
    await session.close();
  }
};

const findLocationByName = async (
  name: string
): Promise<LocationNode | null> => {
  const session = getSessionForDatabase(DB_NAME, neo4j.session.READ);
  try {
    const result = await session.run(
      "MATCH (l:Location {name: $name}) RETURN l LIMIT 1",
      { name }
    );
    const record = result.records[0];
    const node = record?.get("l");
    return (node?.properties ?? null) as LocationNode | null;
  } finally {
    await session.close();
  }
};

const characterNames = [
  "Aiden Black", "Luna Hart", "Ethan Crow", "Nova Vale", "Ryan Storm",
  "Mia Frost", "Leo Kane", "Zara Bloom", "Orion Drake", "Ivy Steele",
  "Kai Mercer", "Sage Rowan", "Dylan Knox", "Aria Quinn", "Reed Ash",
  "Skye Morgan", "Jude Locke", "Wren Hale", "Cole Voss", "Nina Wolfe",
  "Ezra Stone", "Blake North", "Tess Gray", "Mason Reed", "Chloe Ward",
  "Felix Cross", "Jasper Quinn", "Elena Finch", "Victor Lane", "Hazel Snow",
];

const locationNames = [
  "Aetheria", "Silvergate", "Ironhaven", "Moonridge", "Eldervale",
  "Stormwatch", "Ashen Hollow", "Crystal Bay", "Sunspire", "Frostfall",
  "Ravenport", "Goldcrest", "Windmere", "Shadowfen", "Brightwater",
  "Duskfort", "Starfall", "Stonepass", "Emberfield", "Thornwood",
  "Kingsreach", "Highmoor", "Redcliff", "Oakrun", "Nightshade",
];

const factionNames = [
  "Silver Dawn", "Iron Pact", "Obsidian Circle", "Azure Vanguard", "Crimson Court",
  "Golden Order", "Shadow Guild", "Verdant Keep", "Stormborn", "Ivory Council",
  "Eclipse Syndicate", "Radiant Wardens", "Night Lotus", "Ashen Banner", "Frostbound",
  "Sunforge", "Moonlit Assembly", "Griffin Watch", "Cinder Cabal", "Horizon League",
];

const eventNames = [
  "Siege of Ravenport", "Treaty of Silvergate", "Fall of Ironhaven", "Festival of Stars",
  "Nightshade Uprising", "Battle of Emberfield", "Coronation at Sunspire", "Stormwatch Collapse",
  "Shadowfen Pact", "Thornwood Massacre", "Duskfort Betrayal", "Frostfall Exodus",
  "Goldcrest Heist", "Moonridge Summit", "Windmere Duel", "Redcliff Revelation",
  "Crystal Bay Accord", "Aetheria Eclipse", "Ashen Hollow Fire", "Brightwater Flood",
  "Starfall Omen", "Kingsreach Schism", "Oakrun Truce", "Highmoor Hunt",
  "Silver Dawn Rebirth", "Iron Pact March", "Eldervale Miracle", "Stonepass Ambush",
];

const arcNames = ["Shattered Oath", "Rising Shadows", "Crown of Ash", "Dawn of Aether"]; 

const chapterNames = [
  "Whispers", "Fragments", "Crossing", "Echoes", "Breach", "Oath", "Smoke",
  "Wards", "Ash", "Embers", "Vault", "Storm", "Fate", "Thorns", "Crown",
  "Dawn", "Emissary", "Pact", "Rift", "Dusk",
];

const sceneNames = [
  "Silent Gate", "Broken Market", "Hidden Chamber", "River Crossing", "Old Shrine",
  "Midnight Road", "Ashen Square", "Moonlit Garden", "Iron Bridge", "Glass Hall",
  "Whispering Dock", "Sunken Court", "Storm Ridge", "Crimson Alley", "Frosted Gate",
  "Shadow Archive", "Lantern Street", "High Council", "Cinder Vault", "Star Observatory",
  "Duskwell", "Sky Terrace", "Ember Forge", "Raven Tower", "Silver Library",
  "Thorn Maze", "Golden Hall", "East Watch", "West Barracks", "North Keep",
];

const itemNames = [
  "Eclipse Blade", "Mirror Sigil", "Storm Compass", "Ashen Ring", "Frost Lantern",
  "Sun Crown", "Obsidian Key", "Silver Map", "Dusk Pendant", "Cinder Tome",
  "Star Prism", "Moonstone", "Iron Seal", "Wind Charm", "Shadow Mask",
];

const worldRuleTitles = [
  "Soul Resonance", "Bloodline Awakening", "Chronicle Binding", "Aether Debt",
  "Sanctum Oath", "Balance of Power",
];

const races = ["Human", "Elf", "Demon", "Fae", "Beastkin"];
const ranks = ["Novice", "Adept", "Expert", "Master", "Sage", "Legend"];
const abilities = [
  "Shadow Sense", "Aether Pulse", "Frost Veil", "Stormcall", "Ember Heart",
  "Mind Echo", "Stone Skin", "Lunar Step",
];

const locationTypes = [
  "LEVEL 6 - WORLD SCALE",
  "LEVEL 5 - TERRITORY",
  "LEVEL 4 - REGION",
  "LEVEL 3 - SETTLEMENT",
  "LEVEL 2 - COMPLEX",
  "LEVEL 1 - STRUCTURE",
];

const genderList: Array<"male" | "female" | "other"> = [
  "male",
  "female",
  "other",
];

const timelineUnits = ["YEAR", "MONTH", "DAY"]; 

const createProjectInDatabase = async () => {
  const session = getSessionForDatabase(DB_NAME, neo4j.session.WRITE);
  try {
    const now = new Date().toISOString();
    const data = {
      id: generateId(),
      name: seedName("NoeM Data Init"),
      description: "Dữ liệu mẫu cho hệ thống quản lý novel.",
      dbName: DB_NAME,
      status: "active",
      notes: "Tạo tự động cho mục đích demo.",
      tags: ["demo", "datainit"],
      createdAt: now,
      updatedAt: now,
    };
    const params = buildParams(data, [
      "id",
      "name",
      "description",
      "dbName",
      "status",
      "notes",
      "tags",
      "createdAt",
      "updatedAt",
    ]);
    await session.run(
      `CREATE (p:Project {id: $id, name: $name, description: $description, dbName: $dbName, status: $status, notes: $notes, tags: $tags, createdAt: $createdAt, updatedAt: $updatedAt})`,
      params
    );
  } finally {
    await session.close();
  }
};

const seedOverview = async () => {
  try {
    await overviewService.create(
      {
        title: seedName("NoeM Chronicle"),
        subtitle: "Hành trình của những lời thề",
        genre: ["Fantasy", "Mystery"],
        shortSummary: "Tổng quan câu chuyện về sự trỗi dậy của các thế lực mới.",
        worldOverview: "Thế giới phân mảnh bởi các hiệp ước cổ đại và mạch năng lượng Aether.",
        technologyEra: "Cổ kim giao thoa",
      },
      DB_NAME
    );
  } catch {
    // ignore if exists
  }
};

const seedMasterData = async () => {
  for (const name of races) {
    await raceService.create(
      {
        name: seedName(name),
        description: `Mô tả chủng tộc ${name} bằng tiếng Việt.`,
        origin: "Ancient Realm",
        traits: ["tự tôn", "khả năng thích nghi"],
        culture: "Văn hóa truyền thống",
        lifespan: "Trung bình",
        notes: "Dữ liệu mẫu.",
        tags: ["race"],
      },
      DB_NAME
    );
  }

  for (const name of ranks) {
    await rankService.create(
      {
        name: seedName(name),
        tier: "Core",
        system: "Aether Path",
        description: `Cấp bậc ${name} trong hệ thống tu luyện.`,
        notes: "Dữ liệu mẫu.",
        tags: ["rank"],
      },
      DB_NAME
    );
  }

  for (const name of abilities) {
    await specialAbilityService.create(
      {
        name: seedName(name),
        type: Math.random() > 0.5 ? "innate" : "acquired",
        description: `Năng lực ${name} mô tả bằng tiếng Việt.`,
        notes: "Dữ liệu mẫu.",
        tags: ["ability"],
      },
      DB_NAME
    );
  }
};

const seedLocations = async (): Promise<LocationNode[]> => {
  const locations: LocationNode[] = [];
  let nameIndex = 0;

  const createLocation = async (type: string) => {
    const name = seedName(pick(locationNames, nameIndex));
    const existing = await findLocationByName(name);
    if (existing) {
      nameIndex += 1;
      locations.push(existing);
      return existing;
    }
    let created: LocationNode;
    try {
      created = (await locationService.create(
        {
          name,
          type,
          category: "Realm",
          terrain: "Đa dạng",
          climate: "Ôn hòa",
          historicalSummary: "Lịch sử địa điểm được ghi chép qua nhiều thời kỳ.",
          legend: "Truyền thuyết bản địa về các anh hùng cổ xưa.",
          currentStatus: "Đang biến động",
          notes: "Dữ liệu mẫu bằng tiếng Việt.",
          tags: ["location"],
        },
        DB_NAME
      )) as LocationNode;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "Neo.ClientError.Schema.ConstraintValidationFailed") {
        const retry = await findLocationByName(name);
        if (retry) {
          nameIndex += 1;
          locations.push(retry);
          return retry;
        }
      }
      throw error;
    }
    nameIndex += 1;
    locations.push(created as LocationNode);
    return created as LocationNode;
  };

  const world = await createLocation("LEVEL 6 - WORLD SCALE");
  const territories = await Promise.all(
    Array.from({ length: 4 }, () => createLocation("LEVEL 5 - TERRITORY"))
  );
  const regions = await Promise.all(
    Array.from({ length: 6 }, () => createLocation("LEVEL 4 - REGION"))
  );
  const settlements = await Promise.all(
    Array.from({ length: 6 }, () => createLocation("LEVEL 3 - SETTLEMENT"))
  );
  const complexes = await Promise.all(
    Array.from({ length: 3 }, () => createLocation("LEVEL 2 - COMPLEX"))
  );
  const structures = await Promise.all(
    Array.from({ length: 2 }, () => createLocation("LEVEL 1 - STRUCTURE"))
  );

  const linkContains = async (parentId: string, childId: string) => {
    try {
      await locationService.createContains(
        { parentId, childId, sinceYear: 0, note: "Liên kết mẫu" },
        DB_NAME
      );
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 409) {
        return;
      }
      throw error;
    }
  };

  for (const territory of territories) {
    if (!world.id || !territory.id) {
      continue;
    }
    await linkContains(world.id, territory.id);
  }

  for (let i = 0; i < regions.length; i += 1) {
    const region = regions[i]!;
    const parent = territories[i % territories.length]!;
    if (!parent.id || !region.id) {
      continue;
    }
    await linkContains(parent.id, region.id);
  }

  for (let i = 0; i < settlements.length; i += 1) {
    const settlement = settlements[i]!;
    const parent = regions[i % regions.length]!;
    if (!parent.id || !settlement.id) {
      continue;
    }
    await linkContains(parent.id, settlement.id);
  }

  for (let i = 0; i < complexes.length; i += 1) {
    const complex = complexes[i]!;
    const parent = settlements[i % settlements.length]!;
    if (!parent.id || !complex.id) {
      continue;
    }
    await linkContains(parent.id, complex.id);
  }

  for (let i = 0; i < structures.length; i += 1) {
    const structure = structures[i]!;
    const parent = complexes[i % complexes.length]!;
    if (!parent.id || !structure.id) {
      continue;
    }
    await linkContains(parent.id, structure.id);
  }

  return locations;
};

const seedFactions = async (): Promise<FactionNode[]> => {
  const factions: FactionNode[] = [];
  for (let i = 0; i < 20; i += 1) {
    const created = await factionService.create(
      {
        name: seedName(pick(factionNames, i)),
        type: "Guild",
        alignment: i % 2 === 0 ? "Neutral" : "Chaotic",
        ideology: "Bảo vệ cân bằng",
        goal: "Tìm kiếm di vật cổ đại",
        powerLevel: 5 + (i % 5),
        leadershipType: "Council",
        leaderTitle: "Archon",
        reputation: "Nổi tiếng trong khu vực",
        currentStatus: "Hoạt động",
        notes: "Dữ liệu mẫu bằng tiếng Việt.",
        tags: ["faction"],
      },
      DB_NAME
    );
    factions.push(created as FactionNode);
  }
  return factions;
};

const seedTimelines = async () => {
  const timelines: any[] = [];
  for (let i = 0; i < 5; i += 1) {
    const created = await timelineService.create(
      {
        name: seedName(`Era ${i + 1}`),
        code: `ERA-${i + 1}`,
        durationYears: 120 + i * 30,
        summary: "Giai đoạn phát triển của thế giới.",
        description: "Mô tả thời kỳ bằng tiếng Việt.",
        characteristics: ["biến động", "phát triển"],
        dominantForces: ["Aether", "Council"],
        technologyLevel: "Trung bình",
        powerEnvironment: "Dao động",
        worldState: "Ổn định tương đối",
        majorChanges: ["Thiết lập hiệp ước mới"],
        notes: "Dữ liệu mẫu.",
        tags: ["timeline"],
      },
      DB_NAME
    );
    timelines.push(created);
  }
  return timelines;
};

const seedCharacters = async (): Promise<CharacterNode[]> => {
  const characters: CharacterNode[] = [];
  for (let i = 0; i < 24; i += 1) {
    const created = await characterService.create(
      {
        name: seedName(pick(characterNames, i)),
        gender: pick(genderList, i),
        age: 18 + (i % 20),
        race: seedName(pick(races, i)),
        level: seedName(pick(ranks, i)),
        specialAbilities: [
          seedName(pick(abilities, i)),
          seedName(pick(abilities, i + 2)),
        ].filter((value, index, arr) => arr.indexOf(value) === index),
        status: i % 5 === 0 ? "Dead" : "Alive",
        isMainCharacter: i < 3,
        appearance: "Miêu tả ngoại hình bằng tiếng Việt.",
        background: "Bối cảnh nhân vật gắn với chiến tranh cổ đại.",
        notes: "Dữ liệu mẫu.",
        tags: ["character"],
      },
      DB_NAME
    );
    characters.push(created as CharacterNode);
  }
  return characters;
};

const seedEvents = async (
  timelines: any[],
  locations: LocationNode[],
  characters: CharacterNode[]
): Promise<EventNode[]> => {
  const events: EventNode[] = [];
  for (let i = 0; i < 24; i += 1) {
    const timeline = timelines[i % timelines.length];
    const location = locations[i % locations.length]!;
    const participants = [
      characters[i % characters.length]!,
      characters[(i + 3) % characters.length]!,
    ].map((character) => ({
      characterId: character.id,
      role: "participant",
      participationType: "direct",
      outcome: "Sống sót",
      note: "Tham gia trực tiếp",
      characterName: character.name,
    }));

    const created = await eventService.create(
      {
        name: seedName(pick(eventNames, i)),
        type: "Battle",
        scope: "Regional",
        locationId: location.id,
        location: location.name,
        timelineId: timeline.id,
        timelineName: timeline.name,
        timelineYear: 120 + i * 2,
        durationValue: 2,
        durationUnit: pick(timelineUnits, i),
        summary: "Tóm tắt sự kiện bằng tiếng Việt.",
        description: "Mô tả chi tiết sự kiện bằng tiếng Việt.",
        participants,
        notes: "Dữ liệu mẫu.",
        tags: ["event"],
      },
      DB_NAME
    );
    events.push(created as EventNode);
  }
  return events;
};

const seedArcs = async () => {
  const arcs: any[] = [];
  for (let i = 0; i < 4; i += 1) {
    const created = await arcService.create(
      {
        name: seedName(pick(arcNames, i)),
        order: i + 1,
        summary: "Tóm tắt mạch truyện bằng tiếng Việt.",
        notes: "Dữ liệu mẫu.",
        tags: ["arc"],
      },
      DB_NAME
    );
    arcs.push(created);
  }
  return arcs;
};

const seedChapters = async (arcs: any[]) => {
  const chapters: any[] = [];
  for (let i = 0; i < 12; i += 1) {
    const created = await chapterService.create(
      {
        name: seedName(pick(chapterNames, i)),
        order: i + 1,
        summary: "Tóm tắt chương bằng tiếng Việt.",
        notes: "Dữ liệu mẫu.",
        tags: ["chapter"],
        arcId: arcs[i % arcs.length].id,
      },
      DB_NAME
    );
    chapters.push(created);
  }
  return chapters;
};

const seedScenes = async (
  chapters: any[],
  events: EventNode[],
  locations: LocationNode[],
  characters: CharacterNode[]
) => {
  const scenes: any[] = [];
  for (let i = 0; i < 24; i += 1) {
    const created = await sceneService.create(
      {
        name: seedName(pick(sceneNames, i)),
        order: i + 1,
        summary: "Tóm tắt cảnh bằng tiếng Việt.",
        content: "Nội dung cảnh mô tả diễn biến chính.",
        notes: "Dữ liệu mẫu.",
        tags: ["scene"],
        chapterId: chapters[i % chapters.length].id,
        eventId: events[i % events.length]!.id,
        locationId: locations[i % locations.length]!.id,
        characterIds: [
          characters[i % characters.length]!.id,
          characters[(i + 1) % characters.length]!.id,
        ],
      },
      DB_NAME
    );
    scenes.push(created);
  }
  return scenes;
};

const seedItems = async () => {
  const items: any[] = [];
  for (let i = 0; i < 6; i += 1) {
    const created = await itemService.create(
      {
        name: seedName(pick(itemNames, i)),
        type: "Artifact",
        rarity: "Rare",
        origin: "Ancient Vault",
        powerDescription: "Mô tả sức mạnh vật phẩm bằng tiếng Việt.",
        notes: "Dữ liệu mẫu.",
        tags: ["item"],
      },
      DB_NAME
    );
    items.push(created);
  }
  return items;
};

const seedWorldRules = async () => {
  for (const title of worldRuleTitles) {
    await worldRuleService.create(
      {
        title: seedName(title),
        category: "Cosmology",
        description: "Mô tả luật thế giới bằng tiếng Việt.",
        constraints: "Giới hạn áp dụng luật.",
        exceptions: "Ngoại lệ hiếm gặp.",
        status: "active",
        version: "1.0",
        notes: "Dữ liệu mẫu.",
        tags: ["worldrule"],
      },
      DB_NAME
    );
  }
};

const seedRelationships = async (characters: CharacterNode[]) => {
  for (let i = 0; i < 30; i += 1) {
    const from = characters[i % characters.length]!;
    const to = characters[(i + 2) % characters.length]!;
    await relationshipService.create(
      {
        fromId: from.id,
        toId: to.id,
        type: i % 3 === 0 ? "ally" : i % 3 === 1 ? "enemy" : "mentor",
        note: "Quan hệ được mô tả bằng tiếng Việt.",
        startYear: 100 + i,
      },
      DB_NAME
    );
  }
};

const run = async () => {
  await cleanupSeedData();
  await ensureConstraintsForDatabase(DB_NAME);
  try {
    await createProjectInDatabase();
  } catch {
    // ignore duplicate project in datainit db
  }
  await seedOverview();
  await seedMasterData();
  const locations = await seedLocations();
  const factions = await seedFactions();
  const timelines = await seedTimelines();
  const characters = await seedCharacters();
  await seedWorldRules();
  const events = await seedEvents(timelines, locations, characters);
  const arcs = await seedArcs();
  const chapters = await seedChapters(arcs);
  await seedScenes(chapters, events, locations, characters);
  await seedItems();
  await seedRelationships(characters);

  // Touch factions with notes to ensure data exists
  void factions;
};

run()
  .then(() => {
    console.log("Seed datainit completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed datainit failed.", error);
    process.exit(1);
  });
