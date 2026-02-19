import { appConfig } from "../../config/app.config";
import { logger } from "./logger";

type TimelineAuditPayload = {
  action: string;
  method?: string | undefined;
  path?: string | undefined;
  requestId?: string | undefined;
  dbName?: string | undefined;
  resourceId?: string | undefined;
  result?: "success" | "error" | undefined;
  statusCode?: number | undefined;
  detail?: string | undefined;
};

const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const timelineMigrationConfig = {
  readMode: appConfig.flags.timelineReadMode,
  writeMode: appConfig.flags.timelineWriteMode,
  auditEnabled: appConfig.flags.timelineAuditEnabled,
  isTimelineReadEnabled: (): boolean => appConfig.flags.timelineReadMode === "timeline",
  isDualWriteEnabled: (): boolean => appConfig.flags.timelineWriteMode === "dual-write",
  isTimelineWriteEnabled: (): boolean => appConfig.flags.timelineWriteMode === "timeline",
};

export const auditTimelineOperation = (payload: TimelineAuditPayload): void => {
  if (!timelineMigrationConfig.auditEnabled) {
    return;
  }

  logger.info(
    `[timeline-audit] ${safeStringify({
      ...payload,
      readMode: timelineMigrationConfig.readMode,
      writeMode: timelineMigrationConfig.writeMode,
      at: new Date().toISOString(),
    })}`
  );
};
