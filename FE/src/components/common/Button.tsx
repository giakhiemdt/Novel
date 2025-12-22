import { ButtonHTMLAttributes } from "react";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export const Button = ({ variant = "primary", ...props }: ButtonProps) => {
  const className = `button button--${variant} ${props.className ?? ""}`.trim();
  return <button {...props} className={className} />;
};
