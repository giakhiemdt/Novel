import { ReactNode, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export type PageLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export const PageLayout = ({ title, subtitle, children }: PageLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`page-shell ${collapsed ? "page-shell--collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
      <main className="main">
        <Header title={title} subtitle={subtitle} />
        {children}
      </main>
    </div>
  );
};
