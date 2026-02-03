export type EventOverlap = {
  timelineId?: string;
  timelineName?: string;
  eventA: { id: string; name: string; startYear: number; endYear: number };
  eventB: { id: string; name: string; startYear: number; endYear: number };
};

export type SceneOrphan = {
  id: string;
  name: string;
};

export type ChapterOrphan = {
  id: string;
  name: string;
};

export type DeadCharacterConflict = {
  character: { id: string; name: string };
  event: { id: string; name: string };
};

export type ConflictReport = {
  eventOverlaps: EventOverlap[];
  scenesWithoutChapter: SceneOrphan[];
  chaptersWithoutArc: ChapterOrphan[];
  deadCharactersInEvents: DeadCharacterConflict[];
};
