import axios, { type AxiosResponse } from "axios";
import { SAG, useAuthStore } from "@/store/authStore";

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://play.metacube.games/api/v1/";

export interface PlayerData {
  publicKey?: string;
  username?: string;
}

export interface ConnectResponse {
  accessToken?: string;
  playerData?: PlayerData;
  firstTime?: boolean;
  chatToken?: string;
}

export interface RewardAddressResponse {
  address?: string;
}

function treatHTTPResponseACB<T>(res: AxiosResponse<T>): T {
  if (res.status === 200) {
    return res.data;
  }
  throw { response: res };
}

const api = axios.create({ baseURL: BASE_URL });

export function setAccessToken(token: string) {
  SAG.setAccessToken(token);
}

export const postConnectGoogle = async (
  credential: string,
): Promise<ConnectResponse> => {
  const result = await api.post<ConnectResponse>(
    "auth/connect",
    { credential },
    {
      params: { google: "true" },
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(result);
};

export const postConnectGuest = async (
  guestId: string,
): Promise<ConnectResponse> => {
  const result = await api.post<ConnectResponse>(
    "auth/connect",
    { guestId },
    {
      params: { guest: "true" },
    },
  );
  return treatHTTPResponseACB(result);
};

export async function getRewardAddress(): Promise<RewardAddressResponse> {
  const result = await api.get<RewardAddressResponse>("profile/address", {
    headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
    withCredentials: true,
  });
  return treatHTTPResponseACB(result);
}

export async function setRewardAddressBAPI(address: string): Promise<void> {
  const result = await api.post<void>(
    "profile/address",
    { address },
    {
      headers: {
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
      },
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(result);
}
