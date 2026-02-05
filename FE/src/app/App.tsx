import { useLocation } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { AppRouter } from "./router";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "",
    subtitle: "",
  },
  "/overview": {
    title: "",
    subtitle: "",
  },
  "/characters": {
    title: "",
    subtitle: "",
  },
  "/timelines": {
    title: "",
    subtitle: "",
  },
  "/locations": {
    title: "",
    subtitle: "",
  },
  "/factions": {
    title: "",
    subtitle: "",
  },
  "/events": {
    title: "",
    subtitle: "",
  },
};

const getHeaderMeta = (pathname: string) => {
  if (titles[pathname]) {
    return titles[pathname];
  }

  const matched = Object.keys(titles)
    .filter((path) => path !== "/")
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(path));
  return matched ? titles[matched] : titles["/"];
};

export const App = () => {
  const { pathname } = useLocation();
  const headerMeta = getHeaderMeta(pathname);

  return (
    <PageLayout title={headerMeta.title} subtitle={headerMeta.subtitle}>
      <AppRouter />
    </PageLayout>
  );
};
