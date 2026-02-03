import { ButtonHTMLAttributes } from "react";
import { useI18n } from "../../i18n/I18nProvider";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export const Button = ({ variant = "primary", ...props }: ButtonProps) => {
  const { t } = useI18n();
  const className = `button button--${variant} ${props.className ?? ""}`.trim();
  const children =
    typeof props.children === "string" ? t(props.children) : props.children;
  return (
    <button {...props} className={className}>
      {children}
    </button>
  );
};
