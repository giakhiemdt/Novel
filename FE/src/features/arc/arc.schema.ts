import { validateRequired } from "../../utils/validation";
import type { ArcPayload } from "./arc.types";

export const validateArc = (payload: ArcPayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
