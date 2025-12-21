export type AppEnv = {
  NEO4J_URI: string;
  NEO4J_USER: string;
  NEO4J_PASSWORD: string;
  NEO4J_DATABASE: string;
  APP_PORT: number;
  NODE_ENV: "development" | "test" | "production";
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env: AppEnv = {
  NEO4J_URI: process.env.NEO4J_URI ?? "neo4j://localhost:7687",
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
};
