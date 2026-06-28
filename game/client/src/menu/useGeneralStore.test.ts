import { describe, it, expect, beforeEach } from "vitest";
import { useGStore, SGG, SAG } from "./useGeneralStore";

describe("useGeneralStore", () => {
  beforeEach(() => {
    useGStore.getState().resetAllUserStatesToInitialValues();
  });

  describe("Initial State", () => {
    it("should have correct initial values", () => {
      const state = useGStore.getState();

      expect(state.chatFocus).toBe(false);
      expect(state.readyToRender).toBe(false);
      expect(state.readyToRender2).toBe(false);
      expect(state.readyToRender3).toBe(false);
      expect(state.isWalletLoading).toBe(false);
      expect(state.isAuthLoading).toBe(false);
      expect(state.isThirdPerson).toBe(false);
    });

    it("should have correct user state initial values", () => {
      const state = useGStore.getState();

      expect(state.isInGame).toBe(false);
      expect(state.isInGameQueue).toBe(false);
      expect(state.gameQueuePos).toBeUndefined();
      expect(state.isConnected).toBe(false);
      expect(state.isConnectionLoading).toBe(false);
      expect(state.menuDisplay).toBe(true);
      expect(state.address).toBe("");
      expect(state.walletAddress).toBe("");
      expect(state.googleId).toBe("");
      expect(state.guestId).toBe("");
      expect(state.username).toBe("");
      expect(state.definedUsername).toBe(false);
      expect(state.chatToken).toBe("");
      expect(state.isStarknetID).toBe(false);
      expect(state.referral).toBe("");
      expect(state.referralLink).toBe("");
    });
  });

  describe("Auto-generated Setters", () => {
    it("should have setter for isConnected", () => {
      const state = useGStore.getState();

      expect(state.isConnected).toBe(false);
      state.setIsConnected(true);
      expect(useGStore.getState().isConnected).toBe(true);
    });

    it("should have setter for username", () => {
      const state = useGStore.getState();

      expect(state.username).toBe("");
      state.setUsername("TestUser");
      expect(useGStore.getState().username).toBe("TestUser");
    });

    it("should have setter for address", () => {
      const state = useGStore.getState();

      expect(state.address).toBe("");
      state.setAddress("0x1234567890abcdef");
      expect(useGStore.getState().address).toBe("0x1234567890abcdef");
    });

    it("should have setter for menuDisplay", () => {
      const state = useGStore.getState();

      expect(state.menuDisplay).toBe(true);
      state.setMenuDisplay(false);
      expect(useGStore.getState().menuDisplay).toBe(false);
    });

    it("should have setter for isInGame", () => {
      const state = useGStore.getState();

      expect(state.isInGame).toBe(false);
      state.setIsInGame(true);
      expect(useGStore.getState().isInGame).toBe(true);
    });

    it("should have setter for chatFocus", () => {
      const state = useGStore.getState();

      expect(state.chatFocus).toBe(false);
      state.setChatFocus(true);
      expect(useGStore.getState().chatFocus).toBe(true);
    });

    it("should have setter for isThirdPerson", () => {
      const state = useGStore.getState();

      expect(state.isThirdPerson).toBe(false);
      state.setIsThirdPerson(true);
      expect(useGStore.getState().isThirdPerson).toBe(true);
    });
  });

  describe("Custom Actions", () => {
    it("should set game queue with position", () => {
      const state = useGStore.getState();

      state.setIsInGameQueue(true, 5);

      const newState = useGStore.getState();
      expect(newState.isInGameQueue).toBe(true);
      expect(newState.gameQueuePos).toBe(5);
    });

    it("should set game queue without position", () => {
      const state = useGStore.getState();

      state.setIsInGameQueue(true);

      const newState = useGStore.getState();
      expect(newState.isInGameQueue).toBe(true);
      expect(newState.gameQueuePos).toBeUndefined();
    });

    it("should decrease game queue position", () => {
      const state = useGStore.getState();

      state.setIsInGameQueue(true, 5);
      expect(useGStore.getState().gameQueuePos).toBe(5);

      state.decreaseGameQueuePos();
      expect(useGStore.getState().gameQueuePos).toBe(4);

      state.decreaseGameQueuePos();
      expect(useGStore.getState().gameQueuePos).toBe(3);
    });

    it("should not decrease queue position when not in queue", () => {
      const state = useGStore.getState();

      state.setIsInGameQueue(false, 5);
      state.decreaseGameQueuePos();

      expect(useGStore.getState().gameQueuePos).toBe(5);
    });

    it("should not decrease queue position when position is undefined", () => {
      const state = useGStore.getState();

      state.setIsInGameQueue(true);
      state.decreaseGameQueuePos();

      expect(useGStore.getState().gameQueuePos).toBeUndefined();
    });

    it("should reset all user states to initial values", () => {
      const state = useGStore.getState();

      state.setIsConnected(true);
      state.setUsername("TestUser");
      state.setAddress("0x123");
      state.setIsInGame(true);
      state.setIsInGameQueue(true, 5);

      state.resetAllUserStatesToInitialValues();

      const newState = useGStore.getState();
      expect(newState.isConnected).toBe(false);
      expect(newState.username).toBe("");
      expect(newState.address).toBe("");
      expect(newState.isInGame).toBe(false);
      expect(newState.isInGameQueue).toBe(false);
      expect(newState.gameQueuePos).toBeUndefined();
    });
  });

  describe("SGG Getters", () => {
    it("should have getter for isConnected", () => {
      useGStore.getState().setIsConnected(true);
      expect(SGG.getIsConnected()).toBe(true);
    });

    it("should have getter for username", () => {
      useGStore.getState().setUsername("TestUser");
      expect(SGG.getUsername()).toBe("TestUser");
    });

    it("should have getter for address", () => {
      useGStore.getState().setAddress("0x123");
      expect(SGG.getAddress()).toBe("0x123");
    });

    it("should have getter for chatFocus", () => {
      useGStore.getState().setChatFocus(true);
      expect(SGG.getChatFocus()).toBe(true);
    });

    it("should have getter for menuDisplay", () => {
      useGStore.getState().setMenuDisplay(false);
      expect(SGG.getMenuDisplay()).toBe(false);
    });

    it("should have getter for isInGameQueue", () => {
      useGStore.getState().setIsInGameQueue(true, 3);
      expect(SGG.getIsInGameQueue()).toBe(true);
    });

    it("should have getter for gameQueuePos", () => {
      useGStore.getState().setIsInGameQueue(true, 7);
      expect(SGG.getGameQueuePos!()).toBe(7);
    });
  });

  describe("SAG Actions", () => {
    it("should have action for setIsConnected", () => {
      SAG.setIsConnected(true);
      expect(useGStore.getState().isConnected).toBe(true);
    });

    it("should have action for setUsername", () => {
      SAG.setUsername("ActionUser");
      expect(useGStore.getState().username).toBe("ActionUser");
    });

    it("should have action for setAddress", () => {
      SAG.setAddress("0xabc");
      expect(useGStore.getState().address).toBe("0xabc");
    });

    it("should have action for decreaseGameQueuePos", () => {
      useGStore.getState().setIsInGameQueue(true, 5);
      SAG.decreaseGameQueuePos();
      expect(useGStore.getState().gameQueuePos).toBe(4);
    });

    it("should have action for resetAllUserStatesToInitialValues", () => {
      useGStore.getState().setUsername("Test");
      SAG.resetAllUserStatesToInitialValues();
      expect(useGStore.getState().username).toBe("");
    });
  });

  describe("State Persistence", () => {
    it("should maintain state across multiple reads", () => {
      const state = useGStore.getState();
      state.setUsername("PersistTest");

      expect(useGStore.getState().username).toBe("PersistTest");
      expect(SGG.getUsername()).toBe("PersistTest");
      expect(useGStore.getState().username).toBe("PersistTest");
    });

    it("should update state reactively", () => {
      const state = useGStore.getState();

      state.setIsInGameQueue(true, 10);
      expect(useGStore.getState().gameQueuePos).toBe(10);

      state.decreaseGameQueuePos();
      expect(useGStore.getState().gameQueuePos).toBe(9);

      state.decreaseGameQueuePos();
      expect(useGStore.getState().gameQueuePos).toBe(8);
    });
  });

  describe("Complex State Updates", () => {
    it("should handle multiple simultaneous state updates", () => {
      const state = useGStore.getState();

      state.setIsConnected(true);
      state.setUsername("ComplexUser");
      state.setAddress("0xcomplex");
      state.setIsInGame(true);
      state.setIsInGameQueue(true, 3);

      const newState = useGStore.getState();
      expect(newState.isConnected).toBe(true);
      expect(newState.username).toBe("ComplexUser");
      expect(newState.address).toBe("0xcomplex");
      expect(newState.isInGame).toBe(true);
      expect(newState.isInGameQueue).toBe(true);
      expect(newState.gameQueuePos).toBe(3);
    });

    it("should handle authentication flow state changes", () => {
      const state = useGStore.getState();

      state.setIsAuthLoading(true);
      expect(useGStore.getState().isAuthLoading).toBe(true);

      state.setIsConnected(true);
      state.setAddress("0xauth");
      state.setIsAuthLoading(false);

      const newState = useGStore.getState();
      expect(newState.isConnected).toBe(true);
      expect(newState.address).toBe("0xauth");
      expect(newState.isAuthLoading).toBe(false);
    });

    it("should handle game queue flow", () => {
      const state = useGStore.getState();

      state.setIsInGameQueue(true, 5);
      expect(useGStore.getState().isInGameQueue).toBe(true);
      expect(useGStore.getState().gameQueuePos).toBe(5);

      state.decreaseGameQueuePos();
      state.decreaseGameQueuePos();
      expect(useGStore.getState().gameQueuePos).toBe(3);

      state.setIsInGame(true);
      state.setIsInGameQueue(false);
      expect(useGStore.getState().isInGame).toBe(true);
      expect(useGStore.getState().isInGameQueue).toBe(false);
    });
  });
});
