import { validateRequired } from "../../utils/validation";
import type { SpecialAbilityPayload } from "./special-ability.types";

export const validateSpecialAbility = (payload: SpecialAbilityPayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
