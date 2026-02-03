import { validateRequired } from "../../utils/validation";
import type { CharacterRelationPayload } from "./relationship.types";

export const validateRelation = (payload: CharacterRelationPayload) =>
  validateRequired(payload as Record<string, unknown>, [
    "fromId",
    "toId",
    "type",
  ]);
