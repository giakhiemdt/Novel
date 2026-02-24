export const TIMELINE_STRUCT_STATUSES = ["active", "archived"] as const;
export const TIMELINE_AXIS_TYPES = ["main", "parallel", "branch", "loop"] as const;

export type TimelineStructStatus = (typeof TIMELINE_STRUCT_STATUSES)[number];
export type TimelineAxisType = (typeof TIMELINE_AXIS_TYPES)[number];

export type TimelineAxisInput = {
  id?: string;
  name: string;
  code?: string;
  axisType?: TimelineAxisType;
  description?: string;
  parentAxisId?: string;
  policy?: string;
  sortOrder?: number;
  startTick?: number;
  endTick?: number;
  status?: TimelineStructStatus;
  notes?: string;
  tags?: string[];
};

export type TimelineAxisNode = TimelineAxisInput & {
  id: string;
  axisType: TimelineAxisType;
  status: TimelineStructStatus;
  createdAt: string;
  updatedAt: string;
};

export type TimelineEraInput = {
  id?: string;
  axisId: string;
  name: string;
  code?: string;
  summary?: string;
  description?: string;
  order?: number;
  startTick?: number;
  endTick?: number;
  status?: TimelineStructStatus;
  notes?: string;
  tags?: string[];
};

export type TimelineEraNode = TimelineEraInput & {
  id: string;
  status: TimelineStructStatus;
  createdAt: string;
  updatedAt: string;
};

export type TimelineSegmentInput = {
  id?: string;
  axisId?: string;
  eraId: string;
  name: string;
  durationYears: number;
  code?: string;
  summary?: string;
  description?: string;
  order?: number;
  startTick?: number;
  endTick?: number;
  status?: TimelineStructStatus;
  notes?: string;
  tags?: string[];
};

export type TimelineSegmentNode = Omit<TimelineSegmentInput, "axisId"> & {
  id: string;
  axisId: string;
  status: TimelineStructStatus;
  createdAt: string;
  updatedAt: string;
};

export type TimelineMarkerInput = {
  id?: string;
  axisId?: string;
  eraId?: string;
  segmentId: string;
  label: string;
  tick: number;
  markerType?: string;
  description?: string;
  eventRefId?: string;
  status?: TimelineStructStatus;
  notes?: string;
  tags?: string[];
};

export type TimelineMarkerNode = Omit<TimelineMarkerInput, "axisId" | "eraId"> & {
  id: string;
  axisId: string;
  eraId: string;
  status: TimelineStructStatus;
  createdAt: string;
  updatedAt: string;
};

export type TimelineAxisListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  code?: string;
  axisType?: TimelineAxisType;
  status?: TimelineStructStatus;
  parentAxisId?: string;
  total?: number;
};

export type TimelineEraListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  code?: string;
  axisId?: string;
  status?: TimelineStructStatus;
  total?: number;
};

export type TimelineSegmentListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  code?: string;
  axisId?: string;
  eraId?: string;
  status?: TimelineStructStatus;
  total?: number;
};

export type TimelineMarkerListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  label?: string;
  markerType?: string;
  axisId?: string;
  eraId?: string;
  segmentId?: string;
  status?: TimelineStructStatus;
  tickFrom?: number;
  tickTo?: number;
  total?: number;
};

export type TimelineParentRefs = {
  axisId: string;
  eraId?: string;
};
