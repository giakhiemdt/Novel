export type EventPayload = {
  id?: string;
  name: string;
  type?: string;
  typeDetail?: string;
  scope?: string;
  locationId?: string;
  location?: string;
  markerId?: string;
  markerLabel?: string;
  markerTick?: number;
  segmentId?: string;
  segmentName?: string;
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
  participants?: EventParticipant[];
  notes?: string;
  tags?: string[];
};

export type EventParticipant = {
  characterId: string;
  role: string;
  participationType: "ACTIVE" | "PASSIVE" | "INDIRECT";
  outcome?: string;
  statusChange?: string;
  note?: string;
  characterName?: string;
};

export type Event = Omit<EventPayload, "id"> & {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  locationName?: string;
};
