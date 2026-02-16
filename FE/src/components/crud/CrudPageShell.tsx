import { ReactNode } from "react";
import { Button } from "../common/Button";
import { useI18n } from "../../i18n/I18nProvider";

type CrudPageShellProps = {
  title: string;
  subtitle?: string;
  showCreateToggle?: boolean;
  showForm?: boolean;
  createLabel?: string;
  onToggleForm?: () => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  headerActions?: ReactNode;
  controls?: ReactNode;
  list?: ReactNode;
  children?: ReactNode;
};

export const CrudPageShell = ({
  title,
  subtitle,
  showCreateToggle = true,
  showForm = false,
  createLabel = "Create",
  onToggleForm,
  isEditing = false,
  onCancelEdit,
  headerActions,
  controls,
  list,
  children,
}: CrudPageShellProps) => {
  const { t } = useI18n();

  return (
    <div className="card">
      <div className="card__header">
        <div>
          <h3 className="section-title">{t(title)}</h3>
          {subtitle ? <p className="header__subtitle">{t(subtitle)}</p> : null}
        </div>
        <div className="table__actions">
          {showCreateToggle && onToggleForm ? (
            <Button type="button" variant="primary" onClick={onToggleForm}>
              {showForm ? t("Close form") : t(createLabel)}
            </Button>
          ) : null}
          {isEditing && onCancelEdit ? (
            <Button type="button" variant="ghost" onClick={onCancelEdit}>
              {t("Cancel")}
            </Button>
          ) : null}
          {headerActions}
        </div>
      </div>
      {controls}
      {list}
      {children}
    </div>
  );
};
