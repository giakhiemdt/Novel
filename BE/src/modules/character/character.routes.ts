import { RouteConfig } from "../../routes";
import { characterController } from "./character.controller";

export const characterRoutes: RouteConfig[] = [
  {
    method: "GET",
    path: "/characters",
    handler: characterController.getAllCharacters,
    schema: {
      tags: ["Character"],
      summary: "Get all characters",
      response: {
        200: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
  },
  {
    method: "POST",
    path: "/characters",
    handler: characterController.createCharacter,
    schema: {
      tags: ["Character"],
      summary: "Create character",
      body: {
        type: "object",
        required: ["name", "gender", "age", "race"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          alias: { type: "array", items: { type: "string" } },
          soulArt: { type: "array", items: { type: "string" } },
          level: { type: "string", enum: ["T1", "T2", "T3", "T4", "T5", "T6", "T7"] },
          status: { type: "string", enum: ["Alive", "Dead"] },
          isMainCharacter: { type: "boolean" },
          gender: { type: "string", enum: ["male", "female", "other"] },
          age: { type: "number" },
          race: { type: "string", enum: ["human", "elf", "demon"] },
          appearance: { type: "string" },
          height: { type: "number" },
          distinctiveTraits: { type: "array", items: { type: "string" } },
          personalityTraits: { type: "array", items: { type: "string" } },
          beliefs: { type: "array", items: { type: "string" } },
          fears: { type: "array", items: { type: "string" } },
          desires: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
          origin: { type: "string" },
          background: { type: "string" },
          trauma: { type: "array", items: { type: "string" } },
          secret: { type: "string" },
          currentLocation: { type: "string" },
          currentGoal: { type: "string" },
          currentAffiliation: { type: "string" },
          powerState: { type: "string" },
          notes: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      response: {
        201: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                alias: { type: "array", items: { type: "string" } },
                soulArt: { type: "array", items: { type: "string" } },
                level: {
                  type: "string",
                  enum: ["T1", "T2", "T3", "T4", "T5", "T6", "T7"],
                },
                status: { type: "string", enum: ["Alive", "Dead"] },
                isMainCharacter: { type: "boolean" },
                gender: { type: "string", enum: ["male", "female", "other"] },
                age: { type: "number" },
                race: { type: "string", enum: ["human", "elf", "demon"] },
                appearance: { type: "string" },
                height: { type: "number" },
                distinctiveTraits: { type: "array", items: { type: "string" } },
                personalityTraits: { type: "array", items: { type: "string" } },
                beliefs: { type: "array", items: { type: "string" } },
                fears: { type: "array", items: { type: "string" } },
                desires: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                origin: { type: "string" },
                background: { type: "string" },
                trauma: { type: "array", items: { type: "string" } },
                secret: { type: "string" },
                currentLocation: { type: "string" },
                currentGoal: { type: "string" },
                currentAffiliation: { type: "string" },
                powerState: { type: "string" },
                notes: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
        400: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  },
];
