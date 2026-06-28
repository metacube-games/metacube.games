import { useEffect } from "react";
import { getPlayerData } from "../../../../API/backendAPI";
import { SAG } from "../../../useGeneralStore";
import { setNewUsernameToWS } from "../../../Chat";

export function useDeathAndUsernameChecking(
  isInGame: boolean,
  isConnected: boolean,
  setCount: React.Dispatch<React.SetStateAction<number>>,
) {
  useEffect(() => {
    if (!isInGame && isConnected) {
      getPlayerData()
        .then((data) => {
          const bannedTime = Math.max(
            Math.min(
              data.suspendedUntil - Math.round(Date.now() / 1000) + 2,
              4,
            ),
            0,
          );

          setCount(bannedTime);
          const usernameDefined = !(
            data?.username === undefined || data?.username === ""
          );
          SAG.setDefinedUsername(usernameDefined);
          setNewUsernameToWS();
        })
        .catch((err) => {
          console.warn(err);
        });
    }
  }, [isInGame, isConnected, setCount]);
}
