import { env } from "./env";

export const appConfig = {
  port: env.APP_PORT,
  mode: env.NODE_ENV,
  flags: {
    enableDocs: env.NODE_ENV !== "production",
  },
};
