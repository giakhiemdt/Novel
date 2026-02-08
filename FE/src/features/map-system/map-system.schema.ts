import { validateRequired } from "../../utils/validation";
import type { MapSystemPayload } from "./map-system.types";

export const validateMapSystem = (payload: MapSystemPayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
