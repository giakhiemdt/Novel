import { AppError } from "../../shared/errors/app-error";
import {
  getChaptersWithoutArc,
  getDeadCharactersInEvents,
  getEventOverlaps,
  getScenesWithoutChapter,
} from "./conflict.repo";
import { ConflictReport } from "./conflict.types";

const assertDatabaseName = (value: unknown): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError("dbName is required", 400);
  }
  const dbName = value.trim();
  const isValid = /^[A-Za-z0-9_-]+$/.test(dbName);
  if (!isValid) {
    throw new AppError(
      "dbName must contain only letters, numbers, underscores, or hyphens",
      400
    );
  }
  return dbName;
};

export const conflictService = {
  getReport: async (dbName: unknown): Promise<ConflictReport> => {
    const database = assertDatabaseName(dbName);
    const [eventOverlaps, scenesWithoutChapter, chaptersWithoutArc, deadCharactersInEvents] =
      await Promise.all([
        getEventOverlaps(database),
        getScenesWithoutChapter(database),
        getChaptersWithoutArc(database),
        getDeadCharactersInEvents(database),
      ]);

    return {
      eventOverlaps,
      scenesWithoutChapter,
      chaptersWithoutArc,
      deadCharactersInEvents,
    };
  },
};
