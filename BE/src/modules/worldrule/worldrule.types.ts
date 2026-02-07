export type WorldRuleStatus = "draft" | "active" | "deprecated";

export type WorldRuleInput = {
  id?: string;
  title: string;
  category?: string;
  description?: string;
  scope?: string;
  constraints?: string;
  exceptions?: string;
  status?: WorldRuleStatus;
  version?: string;
  validFrom?: number;
  validTo?: number;
  notes?: string;
  tags?: string[];
};

export type WorldRuleNode = WorldRuleInput & {
  id: string;
  status: WorldRuleStatus;
  createdAt: string;
  updatedAt: string;
};

export type WorldRuleListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  title?: string;
  category?: string;
  status?: WorldRuleStatus;
  scope?: string;
  tag?: string;
  total?: number;
};
