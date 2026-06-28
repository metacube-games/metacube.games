import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReferralCode } from "./useReferralCode";
import { useGStore, SAG } from "../menu/useGeneralStore";

describe("useReferralCode", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    useGStore.getState().resetAllUserStatesToInitialValues();

    delete (window as any).location;
    window.location = { ...originalLocation, search: "" } as any;
  });

  afterEach(() => {
    window.location = originalLocation as Location & string;
    vi.clearAllMocks();
  });

  it("should extract referral code from URL query parameter", () => {
    window.location = { ...originalLocation, search: "?referral=12345" } as any;

    renderHook(() => useReferralCode());

    const referral = useGStore.getState().referral;
    expect(referral).toBe("12345");
  });

  it("should not set referral if parameter is missing", () => {
    window.location = { ...originalLocation, search: "" } as any;

    renderHook(() => useReferralCode());

    const referral = useGStore.getState().referral;
    expect(referral).toBe("");
  });

  it("should handle referral parameter with other query params", () => {
    window.location = {
      ...originalLocation,
      search: "?foo=bar&referral=67890&baz=qux",
    } as any;

    renderHook(() => useReferralCode());

    const referral = useGStore.getState().referral;
    expect(referral).toBe("67890");
  });

  it("should handle numeric referral codes", () => {
    window.location = { ...originalLocation, search: "?referral=999" } as any;

    renderHook(() => useReferralCode());

    const referral = useGStore.getState().referral;
    expect(referral).toBe("999");
  });

  it("should handle alphanumeric referral codes", () => {
    window.location = {
      ...originalLocation,
      search: "?referral=abc123xyz",
    } as any;

    renderHook(() => useReferralCode());

    const referral = useGStore.getState().referral;
    expect(referral).toBe("abc123xyz");
  });

  it("should only run once on mount", () => {
    window.location = { ...originalLocation, search: "?referral=123" } as any;

    const { rerender } = renderHook(() => useReferralCode());

    expect(useGStore.getState().referral).toBe("123");

    SAG.setReferral("456");
    expect(useGStore.getState().referral).toBe("456");

    rerender();
    expect(useGStore.getState().referral).toBe("456");
  });

  it("should handle URL encoded referral codes", () => {
    window.location = {
      ...originalLocation,
      search: "?referral=test%20code",
    } as any;

    renderHook(() => useReferralCode());

    const referral = useGStore.getState().referral;
    expect(referral).toBe("test code");
  });

  it("should handle empty referral parameter", () => {
    window.location = { ...originalLocation, search: "?referral=" } as any;

    renderHook(() => useReferralCode());

    const referral = useGStore.getState().referral;
    expect(referral).toBe("");
  });

  it("should handle multiple referral parameters (takes first)", () => {
    window.location = {
      ...originalLocation,
      search: "?referral=first&referral=second",
    } as any;

    renderHook(() => useReferralCode());

    const referral = useGStore.getState().referral;
    expect(referral).toBe("first");
  });

  it("should override an existing referral code when a URL param is present", () => {
    SAG.setReferral("existing");

    window.location = { ...originalLocation, search: "?referral=new" } as any;

    renderHook(() => useReferralCode());

    const referral = useGStore.getState().referral;
    expect(referral).toBe("new");
  });
});
