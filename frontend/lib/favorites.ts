"use client";

import { useSyncExternalStore } from "react";

export interface FavoriteCar {
  id: string;
  name: string;
  image: string;
}

const STORAGE_KEY = "morent:favorites";
const CHANGE_EVENT = "morent:favorites:change";

const EMPTY: FavoriteCar[] = [];
let cache: FavoriteCar[] | null = null;

function parse(raw: string | null): FavoriteCar[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FavoriteCar =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as FavoriteCar).id === "string"
    );
  } catch {
    return [];
  }
}

/** Cached snapshot — useSyncExternalStore requires a stable reference. */
export function getFavorites(): FavoriteCar[] {
  if (cache !== null) return cache;
  cache =
    typeof window === "undefined" ? EMPTY : parse(window.localStorage.getItem(STORAGE_KEY));
  return cache;
}

export function isFavorite(id: string): boolean {
  return getFavorites().some((car) => car.id === id);
}

export function toggleFavorite(car: FavoriteCar): void {
  if (typeof window === "undefined") return;
  const next = isFavorite(car.id)
    ? getFavorites().filter((item) => item.id !== car.id)
    : [car, ...getFavorites()];
  cache = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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

export function useFavorites(): FavoriteCar[] {
  // getFavorites is cached on server + client — safe as all three snapshots
  return useSyncExternalStore(subscribe, getFavorites, getFavorites);
}
