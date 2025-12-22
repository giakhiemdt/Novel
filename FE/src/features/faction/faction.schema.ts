import { validateRequired } from "../../utils/validation";
import type { FactionPayload } from "./faction.types";

export const validateFaction = (payload: FactionPayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
