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

export type SceneListQuery = {
  limit?: number;
  offset?: number;
  q?: string;
  name?: string;
  tag?: string;
  chapterId?: string;
  eventId?: string;
  locationId?: string;
  characterId?: string;
};
