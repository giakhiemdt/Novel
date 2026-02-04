import { validateRequired } from "../../utils/validation";
import type { RankPayload } from "./rank.types";

export const validateRank = (payload: RankPayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
