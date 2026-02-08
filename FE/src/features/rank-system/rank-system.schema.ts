import { validateRequired } from "../../utils/validation";
import type { RankSystemPayload } from "./rank-system.types";

export const validateRankSystem = (payload: RankSystemPayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
