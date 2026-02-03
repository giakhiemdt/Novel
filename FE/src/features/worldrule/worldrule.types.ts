export type WorldRuleStatus = "draft" | "active" | "deprecated";

export type WorldRulePayload = {
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

export type WorldRule = WorldRulePayload & {
  id: string;
  status: WorldRuleStatus;
  createdAt: string;
  updatedAt: string;
};
