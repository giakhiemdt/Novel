import { useLocation } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { AppRouter } from "./router";

const titles: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "",
    subtitle: "",
  },
  "/characters": {
    title: "Characters",
    subtitle: "Shape protagonists, allies, and antagonists with rich detail.",
  },
  "/timelines": {
    title: "Timelines",
    subtitle: "Define eras and connect them with narrative links.",
  },
  "/locations": {
    title: "Locations",
    subtitle: "Map worlds, cities, and hidden realms.",
  },
  "/factions": {
    title: "Factions",
    subtitle: "Organize alliances, enemies, and power structures.",
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
