import { RouteConfig } from "../../routes";
import { characterController } from "./character.controller";

export const characterRoutes: RouteConfig[] = [
  {
    method: "POST",
    path: "/characters",
    handler: characterController.createCharacter,
  },
];
