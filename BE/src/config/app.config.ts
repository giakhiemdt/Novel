import { env } from "./env";

export const appConfig = {
  port: env.APP_PORT,
  mode: env.NODE_ENV,
  flags: {
    enableDocs: env.NODE_ENV !== "production",
    timelineReadMode: env.TIMELINE_READ_MODE,
    timelineWriteMode: env.TIMELINE_WRITE_MODE,
    timelineAuditEnabled: env.TIMELINE_AUDIT_ENABLED,
  },
};
