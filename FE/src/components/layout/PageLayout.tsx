import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { CommandBar } from "../../features/command/CommandBar";
import { TopBar } from "./TopBar";

export type PageLayoutProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export const PageLayout = ({ title, subtitle, children }: PageLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    const key = "novel-nav-stack";
    const stored = sessionStorage.getItem(key);
    const stack = stored ? (JSON.parse(stored) as string[]) : [];
    const current = location.pathname + location.search;
    if (stack[stack.length - 1] !== current) {
      stack.push(current);
    }
    sessionStorage.setItem(key, JSON.stringify(stack.slice(-50)));
  }, [location.pathname, location.search]);

  const handleBack = () => {
    const key = "novel-nav-stack";
    const stored = sessionStorage.getItem(key);
    const stack = stored ? (JSON.parse(stored) as string[]) : [];
    if (stack.length > 1) {
      stack.pop();
      const prev = stack.pop();
      sessionStorage.setItem(key, JSON.stringify(stack));
      navigate(prev ?? "/");
      return;
    }
    navigate("/");
  };

  return (
    <div className={`page-shell ${sidebarOpen ? "" : "page-shell--no-sidebar"}`}>
      {sidebarOpen && <Sidebar />}
      <main className="main">
        <TopBar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onBack={handleBack}
        />
        <Header title={title} subtitle={subtitle} />
        {children}
      </main>
      <CommandBar />
    </div>
  );
};
