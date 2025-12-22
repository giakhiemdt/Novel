import { ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export type PageLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export const PageLayout = ({ title, subtitle, children }: PageLayoutProps) => {
  return (
    <div className="page-shell">
      <Sidebar />
      <main className="main">
        <Header title={title} subtitle={subtitle} />
        {children}
      </main>
    </div>
  );
};
