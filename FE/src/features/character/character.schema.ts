import { validateRequired } from "../../utils/validation";
import type { CharacterPayload } from "./character.types";

export const validateCharacter = (payload: CharacterPayload) =>
  validateRequired(payload as Record<string, unknown>, [
    "name",
    "gender",
    "age",
  ]);
