export type QueryValue = string | number | boolean | null | undefined;

export const toQueryString = (params: Record<string, QueryValue>): string => {
  const entries = Object.entries(params).filter(([, value]) => {
    if (value === undefined || value === null) {
      return false;
    }
    if (typeof value === "string" && value.trim().length === 0) {
      return false;
    }
    return true;
  });

  if (entries.length === 0) {
    return "";
  }

  const search = new URLSearchParams();
  entries.forEach(([key, value]) => {
    search.set(key, String(value));
  });

  return `?${search.toString()}`;
};
