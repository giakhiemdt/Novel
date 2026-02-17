export type WorldRuleStatus = "draft" | "active" | "deprecated";

export type WorldRulePayload = {
  id?: string;
  ruleCode?: string;
  title: string;
  tldr?: string;
  category?: string;
  description?: string;
  scope?: string[];
  timelineIds?: string[];
  triggerConditions?: string[];
  coreRules?: string[];
  consequences?: string[];
  examples?: string[];
  relatedRuleCodes?: string[];
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
