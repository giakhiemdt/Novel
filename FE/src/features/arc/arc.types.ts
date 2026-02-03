export type ArcPayload = {
  id?: string;
  name: string;
  order?: number;
  summary?: string;
  notes?: string;
  tags?: string[];
};

export type Arc = ArcPayload & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type ArcStructureScene = {
  id: string;
  name: string;
  order?: number;
  summary?: string;
};

export type ArcStructureChapter = {
  id: string;
  name: string;
  order?: number;
  summary?: string;
  scenes: ArcStructureScene[];
};

export type ArcStructureArc = {
  id: string;
  name: string;
  order?: number;
  summary?: string;
  chapters: ArcStructureChapter[];
};
