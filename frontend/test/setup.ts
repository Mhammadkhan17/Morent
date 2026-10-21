import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver (used by Radix Slider via use-size).
if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
