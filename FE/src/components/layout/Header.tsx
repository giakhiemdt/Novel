export type HeaderProps = {
  title: string;
  subtitle: string;
};

export const Header = ({ title, subtitle }: HeaderProps) => {
  if (!title && !subtitle) {
    return null;
  }

  return (
    <header className="header">
      <div>
        {title && <h1 className="header__title">{title}</h1>}
        {subtitle && <p className="header__subtitle">{subtitle}</p>}
      </div>
    </header>
  );
};
