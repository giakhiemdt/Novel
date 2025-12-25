export type OverviewPayload = {
  title: string;
  subtitle?: string;
  genre?: string[];
  shortSummary?: string;
  worldOverview?: string;
  technologyEra?: string;
};

export type OverviewNode = OverviewPayload & {
  createdAt: string;
  updatedAt: string;
};
