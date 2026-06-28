import { create } from "zustand";

interface AuthState {
  googleId: string;
  googleUsername: string;
  guestUsername: string;
  accessToken: string;
}

interface AuthActions {
  setGoogleId: (value: string) => void;
  setGoogleUsername: (value: string) => void;
  setGuestUsername: (value: string) => void;
  setAccessToken: (value: string) => void;
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  googleId: "",
  googleUsername: "",
  guestUsername: "",
  accessToken: "",
};

export const useAuthStore = create<AuthStore>()((set) => ({
  ...initialState,
  setGoogleId: (googleId) => set({ googleId }),
  setGoogleUsername: (googleUsername) => set({ googleUsername }),
  setGuestUsername: (guestUsername) => set({ guestUsername }),
  setAccessToken: (accessToken) => set({ accessToken }),
  reset: () => set(initialState),
}));

export const SAG = useAuthStore.getState();
