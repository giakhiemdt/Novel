import { useEffect } from "react";

type ProjectChangeHandler = () => void;

export const useProjectChange = (handler: ProjectChangeHandler) => {
  useEffect(() => {
    const onChange = () => handler();
    window.addEventListener("novel-project-changed", onChange);
    return () => {
      window.removeEventListener("novel-project-changed", onChange);
    };
  }, [handler]);
};
