import { SAG } from "../useGeneralStore";

const GUEST_ID_KEY = "starkgame_guest_id";

export function getGuestIdFromStorage(): string | null {
  return localStorage.getItem(GUEST_ID_KEY);
}

export function saveGuestId(guestId: string): void {
  localStorage.setItem(GUEST_ID_KEY, guestId);
  SAG.setGuestId(guestId);
}

export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_ID_KEY);
  SAG.setGuestId("");
}
