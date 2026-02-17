export const traitSchema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
  },
} as const;

export const traitOrStringSchema = {
  anyOf: [{ type: "string" }, traitSchema],
} as const;

export const traitArrayBodySchema = {
  type: "array",
  items: traitOrStringSchema,
} as const;

export const traitArrayResponseSchema = {
  type: "array",
  items: traitSchema,
} as const;

