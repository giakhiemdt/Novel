import neo4j, { Driver } from "neo4j-driver";
import { neo4jConfig } from "../config/neo4j.config";

let driverInstance: Driver | null = null;

export const getDriver = (): Driver => {
  if (!driverInstance) {
    driverInstance = neo4j.driver(
      neo4jConfig.uri,
      neo4j.auth.basic(neo4jConfig.user, neo4jConfig.password),
      { userAgent: "novel-app" }
    );
  }

  return driverInstance;
};

export const closeDriver = async (): Promise<void> => {
  if (driverInstance) {
    await driverInstance.close();
    driverInstance = null;
  }
};
