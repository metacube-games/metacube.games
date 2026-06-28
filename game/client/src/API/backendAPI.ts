import { SAisAchievementUnlocked } from "../menu/subMenus/NavigationBar/Model/achievement/store";
import { SGG } from "../menu/useGeneralStore";
import axios, { type AxiosResponse } from "axios";

const BASE_URL = import.meta.env.VITE_REACT_APP_BASE_URL;

let accessToken = "";

export function setAccessToken(token: string) {
  accessToken = token;
}

// Mirrors backend PlayerData struct (game/backend/databases/data/cmd.go).
export interface PlayerData {
  publicKey: string;
  username: string;
  suspendedUntil: number;
  coins: number;
  hp: number;
  damageLevel: number;
  multiplierLevel: number;
  healthLevel: number;
  attackRangeLevel: number;
  flyLevel: number;
  criticalHitLevel: number;
  banned: boolean;
  skinId: number;
  rewardAddress: string;
  email: string;
  name: string;
}

// Mirrors backend PlayerStatistics.
export interface PlayerStatistics {
  joined: number;
  cubes: number;
  deaths: number;
  totalCoins: number;
  achievements: Record<string, unknown>;
}

export interface AllStatistics {
  statistics: Record<string, unknown>;
}

export interface SelfReferral {
  referrer: string;
  succeeded: boolean;
}

export interface Referral {
  referred: string;
  succeeded: boolean;
}

export interface AuthResponse {
  accessToken: string;
  playerData: PlayerData;
  firstTime?: boolean;
  chatToken?: string;
}

export interface NonceResponse {
  nonce: string;
}

export interface GuestIdResponse {
  guestId: string;
}

export interface PlaceResponse {
  serverId: number;
  playerData: PlayerData;
}

export interface StarkNameResponse {
  starkname: string;
}

export interface RewardAddressResponse {
  address: string;
}

export interface SkinsResponse {
  selected: number;
  skins: number[];
}

export interface UpgradeResponse {
  playerData: PlayerData;
}

export interface ReferralCodeResponse {
  code: number;
}

export interface ReferralInvitesResponse {
  selfReferral: SelfReferral;
  referrals: Referral[];
}

function treatHTTPResponseACB<T>(res: AxiosResponse<T>): T {
  if (res.status === 200) {
    return res.data;
  } else {
    const error = { response: res };
    throw error;
  }
}

function authHeader() {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function getNonce(publicKey: string): Promise<NonceResponse> {
  const res = await axios.get<NonceResponse>(`${BASE_URL}/auth/nonce`, {
    params: { publicKey },
  });
  return treatHTTPResponseACB(res);
}

export async function postConnect(
  publicKey: string,
  signature: string[],
): Promise<AuthResponse> {
  const referralCode = SGG.getReferral();
  const res = await axios.post<AuthResponse>(
    `${BASE_URL}/auth/connect`,
    {
      publicKey,
      signature,
      referralCode: referralCode?.length > 1 ? Number(referralCode) : undefined,
    },
    {
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function postConnectGoogle(
  credential: string,
): Promise<AuthResponse> {
  const referralCode = SGG.getReferral();
  const res = await axios.post<AuthResponse>(
    `${BASE_URL}/auth/connect`,
    {
      credential,
      referralCode: referralCode?.length > 1 ? Number(referralCode) : undefined,
    },
    {
      params: { google: "true" },
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function postConnectGuest(guestId: string): Promise<AuthResponse> {
  const referralCode = SGG.getReferral();
  const res = await axios.post<AuthResponse>(
    `${BASE_URL}/auth/connect`,
    {
      guestId,
      referralCode: referralCode?.length > 1 ? Number(referralCode) : undefined,
    },
    {
      params: { guest: "true" },
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function getGuestId(): Promise<GuestIdResponse> {
  const res = await axios.get<GuestIdResponse>(`${BASE_URL}/auth/guest`);
  return treatHTTPResponseACB(res);
}

export async function getRefresh(reconnect: boolean): Promise<AuthResponse> {
  const res = await axios.get<AuthResponse>(`${BASE_URL}/auth/refresh`, {
    params: { reconnect: reconnect.toString() },
    withCredentials: true,
  });
  return treatHTTPResponseACB(res);
}

export async function getDisconnect(): Promise<void> {
  const res = await axios.get<void>(`${BASE_URL}/auth/disconnect`, {
    withCredentials: true,
  });
  return treatHTTPResponseACB(res);
}

export async function getPlace(): Promise<PlaceResponse> {
  const res = await axios.get<PlaceResponse>(`${BASE_URL}/game/place`, {
    headers: authHeader(),
    withCredentials: true,
  });
  return treatHTTPResponseACB(res);
}

export async function deleteQueue(): Promise<void> {
  const res = await axios.delete<void>(`${BASE_URL}/game/queue`, {
    headers: authHeader(),
    withCredentials: true,
  });
  return treatHTTPResponseACB(res);
}

export async function getPlayerData(): Promise<PlayerData> {
  const res = await axios.get<PlayerData>(`${BASE_URL}/profile/data`, {
    headers: authHeader(),
    withCredentials: true,
  });
  return treatHTTPResponseACB(res);
}

export async function getPlayerStatistics(): Promise<PlayerStatistics> {
  // Backend stores stats as a serialized JSON string in the DB and returns
  // that string verbatim, so the body is a JSON-encoded string. Axios parses
  // the outer JSON; we parse the inner payload here.
  const res = await axios.get<string>(`${BASE_URL}/profile/stats`, {
    headers: authHeader(),
    withCredentials: true,
  });
  return JSON.parse(treatHTTPResponseACB(res)) as PlayerStatistics;
}

export async function getAllStatistics(): Promise<AllStatistics> {
  const res = await axios.get<AllStatistics>(`${BASE_URL}/info/stats`, {
    headers: authHeader(),
    withCredentials: true,
  });
  return treatHTTPResponseACB(res);
}

export async function getStarkName(): Promise<StarkNameResponse> {
  const res = await axios.get<StarkNameResponse>(
    `${BASE_URL}/profile/starknetid`,
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function setStarkname(starkname: string): Promise<void> {
  const res = await axios.post<void>(
    `${BASE_URL}/profile/starknetid`,
    JSON.stringify({ starkname }),
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function postUsername(username: string): Promise<void> {
  const res = await axios.post<void>(
    `${BASE_URL}/profile/username`,
    JSON.stringify({ username }),
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function postUpgrade(skill: string): Promise<UpgradeResponse> {
  const res = await axios.post<UpgradeResponse>(
    `${BASE_URL}/upgrade/`,
    JSON.stringify({ skill }),
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function getRewardAddress(): Promise<RewardAddressResponse> {
  const res = await axios.get<RewardAddressResponse>(
    `${BASE_URL}/profile/address`,
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function getSkins(): Promise<SkinsResponse> {
  const res = await axios.get<SkinsResponse>(`${BASE_URL}/profile/skins`, {
    headers: authHeader(),
    withCredentials: true,
  });
  return treatHTTPResponseACB(res);
}

export async function postSkin(skin: number): Promise<void> {
  const res = await axios.post<void>(
    `${BASE_URL}/profile/skin`,
    JSON.stringify({ skin }),
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function postLayerAchievement(layer: number): Promise<void> {
  const res = await axios.post<void>(
    `${BASE_URL}/achievements/layer`,
    { layer },
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function postAllyAchievement(): Promise<void> {
  if (SAisAchievementUnlocked("ally", "1")) return;

  const res = await axios.post<void>(
    `${BASE_URL}/achievements/ally`,
    {},
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function getClaim(publicKey: string): Promise<void> {
  const res = await axios.get<void>(`${BASE_URL}/auth/claim`, {
    params: { publicKey },
  });
  return treatHTTPResponseACB(res);
}

export async function getReferralCode(): Promise<ReferralCodeResponse> {
  const res = await axios.get<ReferralCodeResponse>(
    `${BASE_URL}/profile/referral/code`,
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function getReferralInvites(): Promise<ReferralInvitesResponse> {
  const res = await axios.get<ReferralInvitesResponse>(
    `${BASE_URL}/profile/referral/invites`,
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}

export async function getCoins(): Promise<number> {
  const res = await axios.get<number>(`${BASE_URL}/profile/coins`, {
    headers: authHeader(),
    withCredentials: true,
  });
  return treatHTTPResponseACB(res);
}

export async function postTransition(): Promise<void> {
  const res = await axios.post<void>(
    `${BASE_URL}/admin/transition`,
    {},
    {
      headers: authHeader(),
      withCredentials: true,
    },
  );
  return treatHTTPResponseACB(res);
}
