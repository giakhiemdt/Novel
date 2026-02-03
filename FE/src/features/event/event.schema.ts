import { validateRequired } from "../../utils/validation";
import type { EventPayload } from "./event.types";

export const validateEvent = (payload: EventPayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
