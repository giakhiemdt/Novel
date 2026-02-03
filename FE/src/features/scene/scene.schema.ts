import { validateRequired } from "../../utils/validation";
import type { ScenePayload } from "./scene.types";

export const validateScene = (payload: ScenePayload) =>
  validateRequired(payload as Record<string, unknown>, ["name"]);
