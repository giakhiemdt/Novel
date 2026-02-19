export type TimelineReadMode = "legacy" | "timeline";
export type TimelineWriteMode = "legacy" | "dual-write" | "timeline";

export type AppEnv = {
  NEO4J_URI: string;
  NEO4J_USER: string;
  NEO4J_PASSWORD: string;
  NEO4J_DATABASE: string;
  APP_PORT: number;
  NODE_ENV: "development" | "test" | "production";
  TIMELINE_READ_MODE: TimelineReadMode;
  TIMELINE_WRITE_MODE: TimelineWriteMode;
  TIMELINE_AUDIT_ENABLED: boolean;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return fallback;
};

const parseTimelineReadMode = (value: string | undefined): TimelineReadMode => {
  const normalized = value?.trim().toLowerCase();
  return normalized === "timeline" ? "timeline" : "legacy";
};

const parseTimelineWriteMode = (
  value: string | undefined
): TimelineWriteMode => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "timeline") {
    return "timeline";
  }
  if (normalized === "dual-write" || normalized === "dual_write") {
    return "dual-write";
  }
  return "legacy";
};

export const env: AppEnv = {
  NEO4J_URI: process.env.NEO4J_URI ?? "bolt://localhost:7687",
  NEO4J_USER: process.env.NEO4J_USER ?? "neo4j",
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD ?? "12345678",
  NEO4J_DATABASE: process.env.NEO4J_DATABASE ?? "novel",
  APP_PORT: parseNumber(process.env.APP_PORT, 3000),
  NODE_ENV:
    process.env.NODE_ENV === "production"
      ? "production"
      : process.env.NODE_ENV === "test"
      ? "test"
      : "development",
  TIMELINE_READ_MODE: parseTimelineReadMode(process.env.TIMELINE_READ_MODE),
  TIMELINE_WRITE_MODE: parseTimelineWriteMode(process.env.TIMELINE_WRITE_MODE),
  TIMELINE_AUDIT_ENABLED: parseBoolean(process.env.TIMELINE_AUDIT_ENABLED, true),
};
