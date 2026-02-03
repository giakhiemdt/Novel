export type TimelineInput = {
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
