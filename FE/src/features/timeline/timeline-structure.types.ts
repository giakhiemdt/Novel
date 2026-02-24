export type TimelineStructStatus = "active" | "archived";
export type TimelineAxisType = "main" | "parallel" | "branch" | "loop";

export type TimelineAxis = {
  id: string;
  name: string;
  code?: string;
  axisType: TimelineAxisType;
  description?: string;
  parentAxisId?: string;
  policy?: string;
  sortOrder?: number;
  startTick?: number;
  endTick?: number;
  status: TimelineStructStatus;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type TimelineEra = {
  id: string;
  axisId: string;
  name: string;
  code?: string;
  summary?: string;
  description?: string;
  order?: number;
  startTick?: number;
  endTick?: number;
  status: TimelineStructStatus;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type TimelineSegment = {
  id: string;
  axisId: string;
  eraId: string;
  name: string;
  durationYears: number;
  code?: string;
  summary?: string;
  description?: string;
  order?: number;
  startTick?: number;
  endTick?: number;
  status: TimelineStructStatus;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type TimelineMarker = {
  id: string;
  axisId: string;
  eraId: string;
  segmentId: string;
  label: string;
  tick: number;
  markerType?: string;
  description?: string;
  eventRefId?: string;
  status: TimelineStructStatus;
  notes?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type TimelineStateChangeStatus = "active" | "reverted" | "void";

export type TimelineStateSubjectType =
  | "project"
  | "overview"
  | "character"
  | "race"
  | "rank"
  | "rankSystem"
  | "mapSystem"
  | "specialAbility"
  | "event"
  | "faction"
  | "timeline"
  | "timelineAxis"
  | "timelineEra"
  | "timelineSegment"
  | "timelineMarker"
  | "location"
  | "arc"
  | "chapter"
  | "scene"
  | "item"
  | "worldRule"
  | "relationshipType"
  | "energyType"
  | "energyTier";

export type TimelineStateChange = {
  id: string;
  axisId: string;
  eraId?: string;
  segmentId?: string;
  markerId?: string;
  eventId?: string;
  subjectType: TimelineStateSubjectType;
  subjectId: string;
  fieldPath: string;
  changeType?: string;
  oldValue?: string;
  newValue?: string;
  effectiveTick: number;
  detail?: string;
  notes?: string;
  tags?: string[];
  status: TimelineStateChangeStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type TimelineAxisPayload = Partial<TimelineAxis> & Pick<TimelineAxis, "name">;
export type TimelineEraPayload = Partial<TimelineEra> &
  Pick<TimelineEra, "axisId" | "name">;
export type TimelineSegmentPayload = Partial<TimelineSegment> &
  Pick<TimelineSegment, "eraId" | "name" | "durationYears">;
export type TimelineMarkerPayload = Partial<TimelineMarker> &
  Pick<TimelineMarker, "segmentId" | "label" | "tick">;

export type TimelineStructListMeta = {
  q?: string;
  limit?: number;
  offset?: number;
  total?: number;
  [key: string]: unknown;
};

export type TimelineStateDiffField = {
  fieldPath: string;
  fromValue?: unknown;
  toValue?: unknown;
};

export type TimelineStateDiffResult = {
  subjectType: TimelineStateSubjectType;
  subjectId: string;
  fromTick: number;
  toTick: number;
  fromState: Record<string, unknown>;
  toState: Record<string, unknown>;
  addedFields: TimelineStateDiffField[];
  removedFields: TimelineStateDiffField[];
  updatedFields: TimelineStateDiffField[];
};
