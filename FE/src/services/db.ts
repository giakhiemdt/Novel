export const getSelectedDatabase = (): string | null =>
  localStorage.getItem("novel-selected-project-db");

export const withDatabaseHeader = () => {
  const dbName = getSelectedDatabase();
  return dbName ? { headers: { "x-neo4j-database": dbName } } : undefined;
};
