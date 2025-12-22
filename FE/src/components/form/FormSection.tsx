import { ReactNode } from "react";

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
  return (
    <section className="card">
      <h3 className="section-title">{title}</h3>
      {description && <p className="header__subtitle">{description}</p>}
      <div className="form-grid">{children}</div>
    </section>
  );
};
