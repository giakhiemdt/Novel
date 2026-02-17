import { AppError } from "../errors/app-error";
import { Trait } from "../types/trait";

const assertRequiredString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError(`${field} is required`, 400);
  }
  return value.trim();
};

const assertOptionalString = (
  value: unknown,
  field: string
): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new AppError(`${field} must be a string`, 400);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseTraitJsonString = (value: string): Trait | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!trimmed.startsWith("{")) {
    return { name: trimmed };
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed.name !== "string" || parsed.name.trim().length === 0) {
      return undefined;
    }
    const name = parsed.name.trim();
    const description =
      typeof parsed.description === "string" &&
      parsed.description.trim().length > 0
        ? parsed.description.trim()
        : undefined;
    return {
      name,
      ...(description !== undefined ? { description } : {}),
    };
  } catch {
    return { name: trimmed };
  }
};

export const normalizeTraitArray = (value: unknown): Trait[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const parsed: Trait[] = [];
  value.forEach((item) => {
    if (typeof item === "string") {
      const trait = parseTraitJsonString(item);
      if (trait) {
        parsed.push(trait);
      }
      return;
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return;
    }

    const data = item as Record<string, unknown>;
    if (typeof data.name !== "string" || data.name.trim().length === 0) {
      return;
    }

    const name = data.name.trim();
    const description =
      typeof data.description === "string" && data.description.trim().length > 0
        ? data.description.trim()
        : undefined;
    parsed.push({
      name,
      ...(description !== undefined ? { description } : {}),
    });
  });

  if (parsed.length === 0) {
    return undefined;
  }
  return parsed;
};

export const serializeTraitArray = (value: unknown): string[] | undefined => {
  const normalized = normalizeTraitArray(value);
  if (!normalized || normalized.length === 0) {
    return undefined;
  }
  return normalized.map((trait) =>
    JSON.stringify({
      name: trait.name,
      ...(trait.description !== undefined
        ? { description: trait.description }
        : {}),
    })
  );
};

export const assertOptionalTraitArray = (
  value: unknown,
  field: string
): Trait[] | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new AppError(
      `${field} must be an array of trait objects or strings`,
      400
    );
  }

  const parsed: Trait[] = [];
  value.forEach((item, index) => {
    if (typeof item === "string") {
      const name = item.trim();
      if (!name) {
        throw new AppError(`${field}[${index}] must not be empty`, 400);
      }
      parsed.push({ name });
      return;
    }

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new AppError(`${field}[${index}] must be an object`, 400);
    }

    const data = item as Record<string, unknown>;
    const name = assertRequiredString(data.name, `${field}[${index}].name`);
    const description = assertOptionalString(
      data.description,
      `${field}[${index}].description`
    );
    parsed.push({
      name,
      ...(description !== undefined ? { description } : {}),
    });
  });

  if (parsed.length === 0) {
    return undefined;
  }
  return parsed;
};

