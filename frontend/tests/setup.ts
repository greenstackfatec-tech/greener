import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock ResizeObserver for GraficoLinha tests - async callback like real ResizeObserver
class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  callback: ResizeObserverCallback;
  observe = vi.fn((target: Element) => {
    // Fire callback asynchronously like real ResizeObserver
    setTimeout(() => {
      const mockEntry: ResizeObserverEntry = {
        target,
        contentRect: {
          width: target.clientWidth || 800,
          height: target.clientHeight || 400,
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          toJSON: () => {},
        },
        devicePixelContentBox: [],
        contentBoxSize: [],
        borderBoxSize: [],
        devicePixelContentBoxSize: [],
      };
      this.callback([mockEntry], this);
    }, 0);
  });
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock getBoundingClientRect for SVG elements
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function () {
  if (this.tagName === "svg") {
    return { left: 0, top: 0, width: 800, height: 400 };
  }
  return originalGetBoundingClientRect.call(this);
} as typeof originalGetBoundingClientRect;