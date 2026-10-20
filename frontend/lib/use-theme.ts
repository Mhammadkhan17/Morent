"use client";

import { useSyncExternalStore } from "react";
import { getThemeSetting, subscribeTheme, type ThemeSetting } from "./theme";

export function useThemeSetting(): ThemeSetting {
  return useSyncExternalStore(subscribeTheme, getThemeSetting, () => "system");
}
