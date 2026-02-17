import type { Trait, TraitDraft } from "../types/trait";

export const createEmptyTraitDraft = (): TraitDraft => ({
  name: "",
  description: "",
});

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

export const normalizeTraitArray = (value: unknown): Trait[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: Trait[] = [];
  value.forEach((item) => {
    if (typeof item === "string") {
      const parsed = parseTraitJsonString(item);
      if (parsed) {
        normalized.push(parsed);
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
    normalized.push({
      name,
      ...(description !== undefined ? { description } : {}),
    });
  });

  return normalized;
};

export const toTraitDrafts = (value: unknown): TraitDraft[] => {
  const normalized = normalizeTraitArray(value);
  if (normalized.length === 0) {
    return [createEmptyTraitDraft()];
  }
  return normalized.map((trait) => ({
    name: trait.name,
    description: trait.description ?? "",
  }));
};

export const toTraitPayload = (drafts: TraitDraft[]): Trait[] | undefined => {
  const normalized = drafts
    .map((trait) => ({
      name: trait.name.trim(),
      description: trait.description.trim(),
    }))
    .filter((trait) => trait.name.length > 0)
    .map((trait) => ({
      name: trait.name,
      ...(trait.description.length > 0 ? { description: trait.description } : {}),
    }));

  return normalized.length > 0 ? normalized : undefined;
};

export const traitValuesToLabels = (value: unknown): string[] => {
  return normalizeTraitArray(value).map((trait) => trait.name);
};

