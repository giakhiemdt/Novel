export type ScenePayload = {
  id?: string;
  name: string;
  order?: number;
  summary?: string;
  content?: string;
  notes?: string;
  tags?: string[];
  chapterId?: string;
  eventId?: string;
  locationId?: string;
  characterIds?: string[];
};

export type Scene = ScenePayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
