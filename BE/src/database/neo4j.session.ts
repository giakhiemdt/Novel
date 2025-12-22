import neo4j, { Session, SessionMode } from "neo4j-driver";
import { neo4jConfig } from "../config/neo4j.config";
import { getDriver } from "./neo4j.driver";

export const getSession = (
  accessMode: SessionMode = neo4j.session.WRITE
): Session =>
  getDriver().session({
    database: neo4jConfig.database,
    defaultAccessMode: accessMode,
  });

export const verifyConnection = async (): Promise<void> => {
  const session = getSession(neo4j.session.READ);
  try {
    await session.run("RETURN 1 AS ok");
  } finally {
    await session.close();
  }
};
