import { appConfig } from "./config/app.config";
import { createApp } from "./app";
import { closeDriver, verifyConnection } from "./database";
import { logger } from "./shared/utils/logger";

const main = async (): Promise<void> => {
  try {
    await verifyConnection();
    logger.info("Neo4j connection verified against database 'novel'.");

    const app = createApp();
    await app.start();
    logger.info(`API running on port ${appConfig.port}`);

    const shutdown = async () => {
      await app.server.close();
      await closeDriver();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    logger.error(`Failed to start API: ${String(error)}`);
    process.exitCode = 1;
    await closeDriver();
  }
};

void main();
