export type ThemeSetting = "light" | "dark" | "system";

const STORAGE_KEY = "morent:theme";
const CHANGE_EVENT = "morent:theme:change";

let cache: ThemeSetting | null = null;

export function isThemeSetting(value: string | null): value is ThemeSetting {
  return value === "light" || value === "dark" || value === "system";
}

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

export function resolveDark(setting: ThemeSetting): boolean {
  return setting === "dark" || (setting === "system" && prefersDark());
}

/** Cached snapshot — stable reference for useSyncExternalStore. */
export function getThemeSetting(): ThemeSetting {
  if (typeof window === "undefined") return "system";
  if (cache !== null) return cache;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  cache = isThemeSetting(stored) ? stored : "system";
  return cache;
}

/** Apply + persist a theme setting (notifies subscribers). */
export function applyTheme(setting: ThemeSetting): void {
  if (typeof window === "undefined") return;
  cache = setting;
  window.localStorage.setItem(STORAGE_KEY, setting);
  document.documentElement.classList.toggle("dark", resolveDark(setting));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) cache = null;
    listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export { subscribe as subscribeTheme };

/** Inline before hydration — keeps stored/system theme without a flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("morent:theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()`;
