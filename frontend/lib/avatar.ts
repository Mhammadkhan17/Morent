"use client";

/** Initial letter for the avatar fallback (name preferred, else email). */
export function avatarInitial(name?: string | null, email?: string | null): string {
  const source = (name ?? email ?? "?").trim();
  return source.charAt(0).toUpperCase() || "?";
}

// --- Profile photo (device-local, resized data URL) ---

const PHOTO_KEY = "morent:avatar-photo";
const PHOTO_EVENT = "morent:avatar-photo:change";

/** Longest edge kept for stored photos — keeps localStorage usage tiny. */
const PHOTO_MAX = 256;
const PHOTO_QUALITY = 0.85;

let photoCache: string | null | undefined;

/** Cached snapshot — null = no photo. Stable reference for useSyncExternalStore. */
export function getAvatarPhoto(): string | null {
  if (typeof window === "undefined") return null;
  if (photoCache !== undefined) return photoCache;
  photoCache = window.localStorage.getItem(PHOTO_KEY);
  return photoCache;
}

/** Save a photo data URL (or null to clear) — notifies subscribers. */
export function setAvatarPhoto(dataUrl: string | null): void {
  if (typeof window === "undefined") return;
  photoCache = dataUrl;
  if (dataUrl) {
    window.localStorage.setItem(PHOTO_KEY, dataUrl);
  } else {
    window.localStorage.removeItem(PHOTO_KEY);
  }
  window.dispatchEvent(new Event(PHOTO_EVENT));
}

function subscribePhoto(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === PHOTO_KEY || event.key === null) photoCache = undefined;
    listener();
  };
  window.addEventListener(PHOTO_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PHOTO_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export { subscribePhoto as subscribeAvatarPhoto };

/**
 * Cover-crop to a square and re-encode as a small JPEG data URL so it fits
 * comfortably in localStorage. Rejects non-images.
 */
export function fileToAvatarPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Please choose an image file."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight) || PHOTO_MAX;
      const canvas = document.createElement("canvas");
      canvas.width = PHOTO_MAX;
      canvas.height = PHOTO_MAX;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image."));
        return;
      }
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        PHOTO_MAX,
        PHOTO_MAX
      );
      resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}
