export const TIMELINE_STATE_CHANGE_STATUSES = [
  "active",
  "reverted",
  "void",
] as const;

export const TIMELINE_SUBJECT_TYPES = [
  "project",
  "overview",
  "character",
  "race",
  "rank",
  "rankSystem",
  "mapSystem",
  "specialAbility",
  "event",
  "faction",
  "timeline",
  "timelineAxis",
  "timelineEra",
  "timelineSegment",
  "timelineMarker",
  "location",
  "arc",
  "chapter",
  "scene",
  "item",
  "worldRule",
  "relationshipType",
  "energyType",
  "energyTier",
] as const;

export type TimelineStateChangeStatus =
  (typeof TIMELINE_STATE_CHANGE_STATUSES)[number];
export type TimelineSubjectType = (typeof TIMELINE_SUBJECT_TYPES)[number];

export type TimelineStateChangeInput = {
  id?: string;
  axisId: string;
  eraId?: string;
  segmentId?: string;
  markerId?: string;
  eventId?: string;
  subjectType: TimelineSubjectType;
  subjectId: string;
  fieldPath: string;
  changeType?: string;
  oldValue?: string;
  newValue?: string;
  effectiveTick: number;
  detail?: string;
  notes?: string;
  tags?: string[];
  status?: TimelineStateChangeStatus;
};

export type TimelineStateChangeNode = TimelineStateChangeInput & {
  id: string;
  status: TimelineStateChangeStatus;
  createdAt: string;
  updatedAt: string;
};

export type TimelineStateChangeListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  axisId?: string;
  eraId?: string;
  segmentId?: string;
  markerId?: string;
  eventId?: string;
  subjectType?: TimelineSubjectType;
  subjectId?: string;
  fieldPath?: string;
  status?: TimelineStateChangeStatus;
  tickFrom?: number;
  tickTo?: number;
  total?: number;
};

export type TimelineSnapshotQuery = {
  axisId: string;
  tick: number;
  subjectType?: TimelineSubjectType;
  subjectId?: string;
};

export type TimelineProjectionQuery = TimelineSnapshotQuery;

export type TimelineStateProjectionField = {
  stateChangeId: string;
  fieldPath: string;
  value?: unknown;
  rawValue?: string;
  changeType?: string;
  effectiveTick: number;
  markerId?: string;
  eventId?: string;
  updatedAt: string;
};

export type TimelineStateProjectionSubject = {
  subjectType: TimelineSubjectType;
  subjectId: string;
  state: Record<string, unknown>;
  fields: TimelineStateProjectionField[];
};
