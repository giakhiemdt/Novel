export type CommandDefinition = {
  code: string;
  label: string;
  route: string;
};

export const commandRegistry: CommandDefinition[] = [
  { code: "OV01", label: "Overview", route: "/" },
  { code: "CH01", label: "Characters", route: "/characters" },
  { code: "RA01", label: "Races", route: "/races" },
  { code: "RK01", label: "Ranks", route: "/ranks" },
  { code: "SA01", label: "Special Abilities", route: "/special-abilities" },
  { code: "LO01", label: "Locations", route: "/locations" },
  { code: "FA01", label: "Factions", route: "/factions" },
  { code: "IT01", label: "Items", route: "/items" },
  { code: "WR01", label: "World Rules", route: "/world-rules" },
  { code: "TI01", label: "Timelines", route: "/timelines" },
  { code: "EV01", label: "Events", route: "/events" },
  { code: "AR01", label: "Arcs", route: "/arcs" },
  { code: "CP01", label: "Chapters", route: "/chapters" },
  { code: "SC01", label: "Scenes", route: "/scenes" },
  { code: "RL01", label: "Relationships", route: "/relationships" },
  { code: "CF01", label: "Conflicts", route: "/conflicts" },
  { code: "SM01", label: "Schemas", route: "/schemas" },
  { code: "ST01", label: "Settings", route: "/settings" },
];

export const commandMap = new Map(
  commandRegistry.map((command) => [command.code.toUpperCase(), command])
);

export const normalizeCommand = (value: string) => value.trim().toUpperCase();
