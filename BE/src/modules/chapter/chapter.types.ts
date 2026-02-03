export type ChapterInput = {
  id?: string;
  name: string;
  order?: number;
  summary?: string;
  notes?: string;
  tags?: string[];
  arcId?: string;
};

export type ChapterNode = ChapterInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
