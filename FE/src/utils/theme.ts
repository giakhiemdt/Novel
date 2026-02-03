export type ThemePreference = "system" | "dark" | "light";

const THEME_KEY = "novel-theme";
let mediaQuery: MediaQueryList | null = null;
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null;

const resolveTheme = (preference: ThemePreference): "dark" | "light" => {
  if (preference === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }
  return preference;
};

const applyThemeToDom = (preference: ThemePreference) => {
  const root = document.documentElement;
  const resolved = resolveTheme(preference);
  root.dataset.theme = resolved;
  root.dataset.themeMode = preference;
};

const setupSystemListener = () => {
  if (mediaQuery) {
    return;
  }
  mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaListener = () => {
    const preference = getThemePreference();
    if (preference === "system") {
      applyThemeToDom(preference);
    }
  };
  mediaQuery.addEventListener("change", mediaListener);
};

const teardownSystemListener = () => {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener("change", mediaListener);
  }
  mediaQuery = null;
  mediaListener = null;
};

export const getThemePreference = (): ThemePreference => {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light" || stored === "system") {
    return stored;
  }
  return "system";
};

export const setThemePreference = (preference: ThemePreference) => {
  localStorage.setItem(THEME_KEY, preference);
  applyThemeToDom(preference);
  if (preference === "system") {
    setupSystemListener();
  } else {
    teardownSystemListener();
  }
};

export const initTheme = () => {
  const preference = getThemePreference();
  applyThemeToDom(preference);
  if (preference === "system") {
    setupSystemListener();
  }
};
