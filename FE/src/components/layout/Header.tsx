import { useI18n } from "../../i18n/I18nProvider";

export type HeaderProps = {
  title: string;
  subtitle: string;
};

export const Header = ({ title, subtitle }: HeaderProps) => {
  const { t } = useI18n();
  const translatedTitle = title ? t(title) : "";
  const translatedSubtitle = subtitle ? t(subtitle) : "";
  if (!title && !subtitle) {
    return null;
  }

  return (
    <header className="header">
      <div>
        {translatedTitle && <h1 className="header__title">{translatedTitle}</h1>}
        {translatedSubtitle && <p className="header__subtitle">{translatedSubtitle}</p>}
      </div>
    </header>
  );
};
