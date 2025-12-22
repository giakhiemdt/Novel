import { useCallback, useState } from "react";

export const useForm = <T extends Record<string, unknown>>(initial: T) => {
  const [values, setValues] = useState<T>(initial);

  const setField = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const reset = useCallback(() => {
    setValues(initial);
  }, [initial]);

  return { values, setField, setValues, reset };
};
