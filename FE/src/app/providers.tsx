import { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";

export type ProvidersProps = {
  children: ReactNode;
};

export const Providers = ({ children }: ProvidersProps) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};
