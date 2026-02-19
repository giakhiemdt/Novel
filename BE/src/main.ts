import { appConfig } from "./config/app.config";
import { env } from "./config/env";
import { createApp } from "./app";
import { closeDriver, ensureConstraintsForDatabase, verifyConnection } from "./database";
import { logger } from "./shared/utils/logger";
import { timelineMigrationConfig } from "./shared/utils/timeline-migration";

const main = async (): Promise<void> => {
  try {
    await verifyConnection();
    await ensureConstraintsForDatabase(env.NEO4J_DATABASE);
    logger.info("Neo4j connection verified against database 'novel'.");
    logger.info(
      `[timeline-migration] readMode=${timelineMigrationConfig.readMode}, writeMode=${timelineMigrationConfig.writeMode}, audit=${timelineMigrationConfig.auditEnabled}`
    );

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
