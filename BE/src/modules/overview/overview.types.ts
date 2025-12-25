export type OverviewInput = {
  title: string;
  subtitle?: string;
  genre?: string[];
  shortSummary?: string;
  worldOverview?: string;
  technologyEra?: string;
};

export type OverviewNode = OverviewInput & {
  createdAt: string;
  updatedAt: string;
};
