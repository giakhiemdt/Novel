export type EventInput = {
  id?: string;
  name: string;
  type?: string;
  typeDetail?: string;
  scope?: string;
  locationId?: string;
  location?: string;
  timelineId?: string;
  timelineName?: string;
  timelineYear?: number;
  timelineMonth?: number;
  timelineDay?: number;
  durationValue?: number;
  durationUnit?: string;
  startYear?: number;
  endYear?: number;
  summary?: string;
  description?: string;
  participants?: EventParticipantInput[];
  notes?: string;
  tags?: string[];
};

export type EventParticipantInput = {
  characterId: string;
  role: string;
  participationType: string;
  outcome?: string;
  statusChange?: string;
  note?: string;
  characterName?: string;
};

export type EventNode = EventInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  locationName?: string;
};

export type EventListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  timelineId?: string;
  locationId?: string;
  characterId?: string;
  tag?: string;
  name?: string;
  type?: string;
};
