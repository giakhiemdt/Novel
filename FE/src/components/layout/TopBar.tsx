import { useNavigate } from "react-router-dom";
import { Button } from "../common/Button";
import { useI18n } from "../../i18n/I18nProvider";

export type TopBarProps = {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenCommand: () => void;
};

export const TopBar = ({ sidebarOpen, onToggleSidebar, onOpenCommand }: TopBarProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <div className="topbar__left">
        <Button variant="ghost" onClick={onToggleSidebar}>
          {sidebarOpen ? t("Hide sidebar") : t("Show sidebar")}
        </Button>
        <Button variant="ghost" onClick={onOpenCommand}>
          {t("Open T-code")}
        </Button>
      </div>
      <div className="topbar__right">
        <Button variant="ghost" onClick={() => navigate("/settings")}> 
          {t("Settings")}
        </Button>
      </div>
    </div>
  );
};
