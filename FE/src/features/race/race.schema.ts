import { validateRequired } from "../../utils/validation";
import type { RacePayload } from "./race.types";

export const validateRace = (payload: RacePayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
