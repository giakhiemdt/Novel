import { validateRequired } from "../../utils/validation";
import type { WorldRulePayload } from "./worldrule.types";

export const validateWorldRule = (payload: WorldRulePayload) =>
  validateRequired(payload as Record<string, unknown>, ["title"]);
