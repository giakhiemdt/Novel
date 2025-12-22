import { useSearchParams } from "react-router-dom";

export const useQueryParam = (key: string) => {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? "";

  const setValue = (next: string) => {
    const updated = new URLSearchParams(params);
    if (next) {
      updated.set(key, next);
    } else {
      updated.delete(key);
    }
    setParams(updated);
  };

  return { value, setValue };
};
