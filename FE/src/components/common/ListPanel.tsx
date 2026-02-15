import { useI18n } from "../../i18n/I18nProvider";
import listIcon from "../../assets/icons/list.svg";

export type ListPanelProps = {
  open: boolean;
  onToggle: () => void;
};

export const ListPanel = ({ open, onToggle }: ListPanelProps) => {
  const { t } = useI18n();

  return (
    <div className="filter-block">
      <button
        type="button"
        className="filter-toggle"
        onClick={onToggle}
        aria-expanded={open}
      >
        <img className="filter-toggle__icon" src={listIcon} alt={t("List")} />
        <span className="filter-toggle__label">
          {open ? t("Hide list") : t("Show list")}
        </span>
      </button>
      {open && <p className="header__subtitle">{t("List")}</p>}
    </div>
  );
};
