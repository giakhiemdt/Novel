import { useI18n } from "../../i18n/I18nProvider";

export const Loading = () => {
  const { t } = useI18n();
  return <div className="notice">{t("Loading...")}</div>;
};
