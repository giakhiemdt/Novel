import { validateRequired } from "../../utils/validation";
import type { ChapterPayload } from "./chapter.types";

export const validateChapter = (payload: ChapterPayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
