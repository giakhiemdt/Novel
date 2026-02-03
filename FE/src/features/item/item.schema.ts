import { validateRequired } from "../../utils/validation";
import type { ItemPayload } from "./item.types";

export const validateItem = (payload: ItemPayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
