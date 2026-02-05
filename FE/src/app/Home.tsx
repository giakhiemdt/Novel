import { useI18n } from "../i18n/I18nProvider";

export const Home = () => {
  const { t } = useI18n();
  return (
    <div className="home-page">
      <h1 className="home-title">{t("NoeM")}</h1>
    </div>
  );
};
