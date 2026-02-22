import { Trait } from "../../shared/types/trait";

export type TimelineInput = {
  id?: string;
  name: string;
  code?: string;
  durationYears: number;
  isOngoing?: boolean;
  summary?: string;
  description?: string;
  characteristics?: Array<Trait | string>;
  dominantForces?: string[];
  technologyLevel?: string;
  powerEnvironment?: string;
  worldState?: string;
  majorChanges?: string[];
  notes?: string;
  tags?: string[];
  previousId?: string;
  nextId?: string;
};

export type TimelineNode = TimelineInput & {
  isOngoing: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TimelineLinkInput = {
  currentId: string;
  previousId?: string;
  nextId?: string;
};

export type TimelineListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  code?: string;
  isOngoing?: boolean;
  total?: number;
};

export type LegacyTimelineMigrationResult = {
  axisId: string;
  eraId: string;
  timelinesFound: number;
  segmentsCreated: number;
  segmentsTotal: number;
  legacyEventLinksFound: number;
  markersCreated: number;
  markersTotal: number;
  worldRulesUpdated: number;
  unresolvedLegacyEventLinks: number;
  deletedOccursOnRelations: number;
  deletedTimelines: number;
  deletedLegacyTimelineNodes: boolean;
};
