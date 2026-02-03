import { ReactNode } from "react";
import { useI18n } from "../../i18n/I18nProvider";

export type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export const FormSection = ({
  title,
  description,
  children,
}: FormSectionProps) => {
  const { t } = useI18n();
  return (
    <section className="card">
      <h3 className="section-title">{t(title)}</h3>
      {description && <p className="header__subtitle">{t(description)}</p>}
      <div className="form-grid">{children}</div>
    </section>
  );
};
