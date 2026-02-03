import { validateRequired } from "../../utils/validation";
import type { LocationPayload } from "./location.types";

export const validateLocation = (payload: LocationPayload) =>
  validateRequired(payload as Record<string, unknown>, ["name", "type"]);
