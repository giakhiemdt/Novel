export type SceneInput = {
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

export type SceneNode = SceneInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
