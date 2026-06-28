import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage / sessionStorage. jsdom does not provide Web Storage in
// every runtime (e.g. headless containers / CI without --localstorage-file),
// so back it with a deterministic in-memory implementation.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

for (const prop of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(window, prop, {
    writable: true,
    value: new MemoryStorage(),
  });
}

// Mock WebGL context for Three.js
HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
  if (contextId === "webgl" || contextId === "webgl2") {
    return {
      canvas: document.createElement("canvas"),
      drawingBufferWidth: 800,
      drawingBufferHeight: 600,
      getExtension: vi.fn(),
      getParameter: vi.fn(),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      clear: vi.fn(),
      clearColor: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      viewport: vi.fn(),
    };
  }
  return null;
}) as unknown as HTMLCanvasElement["getContext"];

global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
})) as any;

// Mock Worker — jsdom does not provide it, and several singletons (collision /
// mesh / text workers) instantiate one at import time. Must be constructable.
class WorkerMock {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  onmessageerror: ((e: MessageEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}
global.Worker = WorkerMock as unknown as typeof Worker;

vi.mock("import.meta", () => ({
  env: {
    VITE_REACT_APP_INIT_URL: "http://localhost:8080",
    VITE_REACT_APP_WS_URL: "ws://localhost:8080",
    VITE_REACT_APP_BACKEND_URL: "http://localhost:8080",
  },
}));
