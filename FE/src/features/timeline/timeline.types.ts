export type TimelinePayload = {
  id?: string;
  name: string;
  code?: string;
  durationYears: number;
  isOngoing?: boolean;
  summary?: string;
  description?: string;
  characteristics?: string[];
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

export type Timeline = TimelinePayload & {
  createdAt?: string;
  updatedAt?: string;
  previousId?: string;
  nextId?: string;
};

export type TimelineLinkPayload = {
  currentId: string;
  previousId?: string;
  nextId?: string;
};
