import { env } from "./env";

export const neo4jConfig = {
  uri: env.NEO4J_URI,
  user: env.NEO4J_USER,
  password: env.NEO4J_PASSWORD,
  database: env.NEO4J_DATABASE,
};
