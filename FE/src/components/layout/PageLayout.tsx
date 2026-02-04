import { ReactNode, useEffect, useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CommandBar } from "../../features/command/CommandBar";

export type PageLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export const PageLayout = ({ title, subtitle, children }: PageLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isToggle = event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "m";
      if (isToggle) {
        event.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="page-shell">
      {sidebarOpen && <Sidebar />}
      <main className="main">
        <Header title={title} subtitle={subtitle} />
        {children}
      </main>
      <CommandBar />
    </div>
  );
};
