import { ReactNode, useState } from "react";
import { useI18n } from "../../i18n/I18nProvider";

export type FilterPanelProps = {
  children: ReactNode;
  defaultOpen?: boolean;
};

export const FilterPanel = ({ children, defaultOpen = true }: FilterPanelProps) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="filter-block">
      <button
        type="button"
        className="filter-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <img
          className="filter-toggle__icon"
          src="/icons8-filter-100.png"
          alt={t("Filters")}
        />
        <span className="filter-toggle__label">
          {open ? t("Hide filters") : t("Show filters")}
        </span>
      </button>
      {open && (
        <>
          <p className="header__subtitle">{t("Filters")}</p>
          <div className="form-grid">{children}</div>
        </>
      )}
    </div>
  );
};
