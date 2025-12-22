export const buildParams = (
  data: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> =>
  keys.reduce<Record<string, unknown>>((acc, key) => {
    acc[key] = data[key] ?? null;
    return acc;
  }, {});
