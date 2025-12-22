export const validateRequired = (
  payload: Record<string, unknown>,
  required: string[],
) => {
  const missing = required.filter((key) => {
    const value = payload[key];
    if (value === undefined || value === null) {
      return true;
    }
    if (typeof value === "string" && value.trim() === "") {
      return true;
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      return true;
    }
    return false;
  });

  return {
    valid: missing.length === 0,
    missing,
  };
};
