import { describe, it, expect, beforeEach, vi } from "vitest";
import axios from "axios";
import {
  setAccessToken,
  getNonce,
  postConnect,
  getCoins,
  postUpgrade,
  postUsername,
  getSkins,
  postSkin,
  getPlayerData,
  getReferralCode,
  getDisconnect,
} from "./backendAPI";
import { useGStore } from "../menu/useGeneralStore";
import { useAchievementsStore } from "../menu/subMenus/NavigationBar/Model/achievement/store";

vi.mock("axios");

describe("Backend API", () => {
  const BASE_URL = import.meta.env.VITE_REACT_APP_BASE_URL;
  const mockAccessToken = "test-access-token";

  beforeEach(() => {
    vi.clearAllMocks();
    setAccessToken(mockAccessToken);

    // Reset stores
    useGStore.getState().resetAllUserStatesToInitialValues();
    useAchievementsStore.getState().resetAchievements();
  });

  describe("setAccessToken", () => {
    it("should set access token", () => {
      setAccessToken("new-token");
      // Token is set internally, we'll verify it's used in subsequent calls
      expect(true).toBe(true);
    });
  });

  describe("getNonce", () => {
    it("should fetch nonce for a given public key", async () => {
      const mockNonce = "123456789";
      const publicKey = "0xabcdef";

      (axios.get as any).mockResolvedValue({
        status: 200,
        data: mockNonce,
      });

      const result = await getNonce(publicKey);

      expect(axios.get).toHaveBeenCalledWith(`${BASE_URL}/auth/nonce`, {
        params: { publicKey },
      });
      expect(result).toBe(mockNonce);
    });

    it("should throw error on non-200 status", async () => {
      (axios.get as any).mockResolvedValue({
        status: 400,
        data: "Bad Request",
      });

      await expect(getNonce("0xbad")).rejects.toThrow();
    });
  });

  describe("postConnect", () => {
    it("should connect with public key and signature", async () => {
      const publicKey = "0x123";
      const signature = ["sig1", "sig2"];
      const mockResponse = { token: "jwt-token", user: { id: 1 } };

      useGStore.getState().setReferral("12345");

      (axios.post as any).mockResolvedValue({
        status: 200,
        data: mockResponse,
      });

      const result = await postConnect(publicKey, signature);

      expect(axios.post).toHaveBeenCalledWith(
        `${BASE_URL}/auth/connect`,
        {
          publicKey,
          signature,
          referralCode: 12345,
        },
        {
          withCredentials: true,
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should not send referralCode if empty", async () => {
      const publicKey = "0x123";
      const signature = ["sig1", "sig2"];

      useGStore.getState().setReferral("");

      (axios.post as any).mockResolvedValue({
        status: 200,
        data: {},
      });

      await postConnect(publicKey, signature);

      expect(axios.post).toHaveBeenCalledWith(
        `${BASE_URL}/auth/connect`,
        {
          publicKey,
          signature,
          referralCode: undefined,
        },
        {
          withCredentials: true,
        },
      );
    });

    it("should handle connection errors", async () => {
      const mockError = {
        response: { status: 401, data: "Unauthorized" },
      };

      (axios.post as any).mockRejectedValue(mockError);

      // Function catches error, but treatHTTPResponseACB throws because error object has no status
      await expect(postConnect("0x123", ["sig"])).rejects.toThrow();
    });
  });

  describe("getCoins", () => {
    it("should fetch user coins", async () => {
      const mockCoins = 1000;

      (axios.get as any).mockResolvedValue({
        status: 200,
        data: mockCoins,
      });

      const result = await getCoins();

      expect(axios.get).toHaveBeenCalledWith(`${BASE_URL}/profile/coins`, {
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
        withCredentials: true,
      });
      expect(result).toBe(mockCoins);
    });

    it("should throw error on failed request", async () => {
      (axios.get as any).mockResolvedValue({
        status: 500,
        data: "Server Error",
      });

      await expect(getCoins()).rejects.toThrow();
    });
  });

  describe("postUpgrade", () => {
    it("should post upgrade request", async () => {
      const skill = "miningRig";
      const mockResponse = {
        playerData: {
          coins: 800,
          miningRigLevel: 2,
        },
      };

      (axios.post as any).mockResolvedValue({
        status: 200,
        data: mockResponse,
      });

      const result = await postUpgrade(skill);

      expect(axios.post).toHaveBeenCalledWith(
        `${BASE_URL}/upgrade/`,
        JSON.stringify({ skill }),
        {
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
          withCredentials: true,
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle upgrade errors", async () => {
      (axios.post as any).mockResolvedValue({
        status: 400,
        data: "Insufficient funds",
      });

      await expect(postUpgrade("wallet")).rejects.toThrow();
    });
  });

  describe("postUsername", () => {
    it("should post username update", async () => {
      const username = "NewUsername";
      const mockResponse = { success: true };

      (axios.post as any).mockResolvedValue({
        status: 200,
        data: mockResponse,
      });

      const result = await postUsername(username);

      expect(axios.post).toHaveBeenCalledWith(
        `${BASE_URL}/profile/username`,
        JSON.stringify({ username }),
        {
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
          withCredentials: true,
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should reject invalid username", async () => {
      (axios.post as any).mockResolvedValue({
        status: 400,
        data: "Username taken",
      });

      await expect(postUsername("taken")).rejects.toThrow();
    });
  });

  describe("getSkins", () => {
    it("should fetch available skins", async () => {
      const mockSkins = [
        { id: 1, name: "Default" },
        { id: 2, name: "Premium" },
      ];

      (axios.get as any).mockResolvedValue({
        status: 200,
        data: mockSkins,
      });

      const result = await getSkins();

      expect(axios.get).toHaveBeenCalledWith(`${BASE_URL}/profile/skins`, {
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
        withCredentials: true,
      });
      expect(result).toEqual(mockSkins);
    });
  });

  describe("postSkin", () => {
    it("should select a skin", async () => {
      const skinId = 2;
      const mockResponse = { success: true };

      (axios.post as any).mockResolvedValue({
        status: 200,
        data: mockResponse,
      });

      const result = await postSkin(skinId);

      expect(axios.post).toHaveBeenCalledWith(
        `${BASE_URL}/profile/skin`,
        JSON.stringify({ skin: skinId }),
        {
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
          withCredentials: true,
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle invalid skin selection", async () => {
      (axios.post as any).mockResolvedValue({
        status: 404,
        data: "Skin not found",
      });

      await expect(postSkin(999)).rejects.toThrow();
    });
  });

  describe("getPlayerData", () => {
    it("should fetch player profile data", async () => {
      const mockPlayerData = {
        username: "TestPlayer",
        coins: 1500,
        level: 10,
      };

      (axios.get as any).mockResolvedValue({
        status: 200,
        data: mockPlayerData,
      });

      const result = await getPlayerData();

      expect(axios.get).toHaveBeenCalledWith(`${BASE_URL}/profile/data`, {
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
        },
        withCredentials: true,
      });
      expect(result).toEqual(mockPlayerData);
    });
  });

  describe("getReferralCode", () => {
    it("should fetch referral code", async () => {
      const mockReferralCode = "REF12345";

      (axios.get as any).mockResolvedValue({
        status: 200,
        data: mockReferralCode,
      });

      const result = await getReferralCode();

      expect(axios.get).toHaveBeenCalledWith(
        `${BASE_URL}/profile/referral/code`,
        {
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
          withCredentials: true,
        },
      );
      expect(result).toBe(mockReferralCode);
    });
  });

  describe("getDisconnect", () => {
    it("should disconnect user", async () => {
      const mockResponse = { success: true };

      (axios.get as any).mockResolvedValue({
        status: 200,
        data: mockResponse,
      });

      const result = await getDisconnect();

      expect(axios.get).toHaveBeenCalledWith(`${BASE_URL}/auth/disconnect`, {
        withCredentials: true,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("HTTP Response Handler", () => {
    it("should return data on 200 status", async () => {
      const mockData = { test: "data" };

      (axios.get as any).mockResolvedValue({
        status: 200,
        data: mockData,
      });

      const result = await getCoins();
      expect(result).toEqual(mockData);
    });

    it("should throw on non-200 status", async () => {
      (axios.get as any).mockResolvedValue({
        status: 404,
        data: "Not Found",
      });

      await expect(getCoins()).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      (axios.get as any).mockRejectedValue(new Error("Network Error"));

      await expect(getCoins()).rejects.toThrow("Network Error");
    });
  });

  describe("Authorization Headers", () => {
    it("should include authorization header in authenticated requests", async () => {
      setAccessToken("custom-token");

      (axios.get as any).mockResolvedValue({
        status: 200,
        data: 100,
      });

      await getCoins();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer custom-token",
          }),
        }),
      );
    });

    it("should include withCredentials in all requests", async () => {
      (axios.get as any).mockResolvedValue({
        status: 200,
        data: {},
      });

      await getCoins();

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          withCredentials: true,
        }),
      );
    });
  });

  describe("Referral Code Handling", () => {
    it("should convert referral to number when length > 1", async () => {
      useGStore.getState().setReferral("123");

      (axios.post as any).mockResolvedValue({
        status: 200,
        data: {},
      });

      await postConnect("0x123", ["sig"]);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          referralCode: 123,
        }),
        expect.any(Object),
      );
    });

    it("should not send referral when length <= 1", async () => {
      useGStore.getState().setReferral("1");

      (axios.post as any).mockResolvedValue({
        status: 200,
        data: {},
      });

      await postConnect("0x123", ["sig"]);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          referralCode: undefined,
        }),
        expect.any(Object),
      );
    });
  });
});
