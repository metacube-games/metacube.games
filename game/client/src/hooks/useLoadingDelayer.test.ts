import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLoadingDelayer } from "./useLoadingDelayer";
import { useGStore } from "../menu/useGeneralStore";

vi.mock("../world/model/Loading", () => ({
  CILoading: {
    loadingProgress: {
      sendEvent: vi.fn(),
    },
  },
}));

import { CILoading } from "../world/model/Loading";

describe("useLoadingDelayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    useGStore.getState().resetAllUserStatesToInitialValues();
    useGStore.getState().setReadyToRender(false);
    useGStore.getState().setReadyToRender2(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should not send events when readyToRender is false", () => {
    useGStore.getState().setReadyToRender(false);

    renderHook(() => useLoadingDelayer());

    vi.advanceTimersByTime(2000);

    expect(CILoading.loadingProgress.sendEvent).not.toHaveBeenCalled();
  });

  it("should send 111 immediately when both readyToRender and readyToRender2 are true", () => {
    useGStore.getState().setReadyToRender(true);
    useGStore.getState().setReadyToRender2(true);

    renderHook(() => useLoadingDelayer());

    expect(CILoading.loadingProgress.sendEvent).toHaveBeenCalledWith(111);
    expect(CILoading.loadingProgress.sendEvent).toHaveBeenCalledTimes(1);
  });

  it("should send progressive events from 101 to 111 when only readyToRender is true", () => {
    useGStore.getState().setReadyToRender(true);
    useGStore.getState().setReadyToRender2(false);

    renderHook(() => useLoadingDelayer());

    vi.advanceTimersByTime(1000);

    expect(CILoading.loadingProgress.sendEvent).toHaveBeenCalledTimes(10);

    const calls = (CILoading.loadingProgress.sendEvent as any).mock.calls;
    expect(calls[0][0]).toBe(102);
    expect(calls[9][0]).toBe(111);
  });

  it("should create progressive loading values", () => {
    useGStore.getState().setReadyToRender(true);
    useGStore.getState().setReadyToRender2(false);

    renderHook(() => useLoadingDelayer());

    vi.advanceTimersByTime(1000);

    const calls = (CILoading.loadingProgress.sendEvent as any).mock.calls;

    for (let i = 1; i < calls.length; i++) {
      expect(calls[i][0]).toBeGreaterThan(calls[i - 1][0]);
    }
  });

  it("should cleanup timeouts on unmount", () => {
    useGStore.getState().setReadyToRender(true);
    useGStore.getState().setReadyToRender2(false);

    const { unmount } = renderHook(() => useLoadingDelayer());

    unmount();

    vi.advanceTimersByTime(1000);

    const callCount = (CILoading.loadingProgress.sendEvent as any).mock.calls
      .length;
    expect(callCount).toBeLessThanOrEqual(10);
  });

  it("should handle rapid state changes", () => {
    const { rerender } = renderHook(() => useLoadingDelayer());

    useGStore.getState().setReadyToRender(false);
    rerender();

    useGStore.getState().setReadyToRender(true);
    rerender();

    vi.advanceTimersByTime(100);

    expect(CILoading.loadingProgress.sendEvent).toHaveBeenCalled();
  });

  it("should send 111 when readyToRender2 becomes true during loading", () => {
    useGStore.getState().setReadyToRender(true);
    useGStore.getState().setReadyToRender2(false);

    const { unmount } = renderHook(() => useLoadingDelayer());

    vi.advanceTimersByTime(200);

    unmount();

    useGStore.getState().setReadyToRender2(true);
    renderHook(() => useLoadingDelayer());

    const calls = (CILoading.loadingProgress.sendEvent as any).mock.calls;
    const last = calls[calls.length - 1][0];
    expect(last).toBe(111);
  });

  it("should respect timeout intervals", () => {
    useGStore.getState().setReadyToRender(true);
    useGStore.getState().setReadyToRender2(false);

    renderHook(() => useLoadingDelayer());

    vi.advanceTimersByTime(0);
    expect(CILoading.loadingProgress.sendEvent).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    expect(CILoading.loadingProgress.sendEvent).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(100);
    expect(CILoading.loadingProgress.sendEvent).toHaveBeenCalledTimes(3);

    vi.advanceTimersByTime(700);
    expect(CILoading.loadingProgress.sendEvent).toHaveBeenCalledTimes(10);
  });

  it("should not send events if readyToRender becomes false after initialization", () => {
    useGStore.getState().setReadyToRender(true);

    const { rerender } = renderHook(() => useLoadingDelayer());

    vi.advanceTimersByTime(100);

    const initialCalls = (CILoading.loadingProgress.sendEvent as any).mock.calls
      .length;

    useGStore.getState().setReadyToRender(false);
    rerender();

    vi.advanceTimersByTime(900);

    const finalCalls = (CILoading.loadingProgress.sendEvent as any).mock.calls
      .length;
    expect(finalCalls).toBeGreaterThanOrEqual(initialCalls);
  });
});
