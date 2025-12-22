import { validateRequired } from "../../utils/validation";
import type { TimelineLinkPayload, TimelinePayload } from "./timeline.types";

export const validateTimeline = (payload: TimelinePayload) =>
  validateRequired(payload as Record<string, unknown>, [
    "name",
    "startYear",
    "endYear",
  ]);

export const validateTimelineLink = (payload: TimelineLinkPayload) =>
  validateRequired(payload as Record<string, unknown>, ["currentId"]);
