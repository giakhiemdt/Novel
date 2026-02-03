export type ChapterPayload = {
  id?: string;
  name: string;
  order?: number;
  summary?: string;
  notes?: string;
  tags?: string[];
  arcId?: string;
};

export type Chapter = ChapterPayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
