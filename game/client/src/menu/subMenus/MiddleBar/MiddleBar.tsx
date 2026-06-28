import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { Check, Loader2, LogOut, Play } from "lucide-react";
import { ViewerState } from "./ViewerState";
import { postUsername } from "../../../API/backendAPI";
import { useGenerateInfoText } from "./UsernameInfoText";
import { containsProfanity } from "./containsProfanity";
import { SAG, useGStore } from "../../useGeneralStore";
import { useOpenConnexionModal } from "../NavigationBar/ConnexionModal";
import { setNewUsernameToWS } from "../../Chat";
import { Button } from "../../../components/ui/button";
import { useShallow } from "zustand/react/shallow";
import { useTranslation } from "react-i18next";

import { QueueDisplayer } from "./components/QueueDisplayer";
import { UsernameDisplayer } from "./components/UsernameDisplayer";
import { PostTransitionAction } from "./components/PostTransitionAction";

import { useCounter } from "./hooks/useCounter";
import { useDeathAndUsernameChecking } from "./hooks/useDeathAndUsernameChecking";

export interface TMiddleBarProps {
  leftButtonClicked: React.MouseEventHandler<HTMLButtonElement> | undefined;
  rightButtonClicked: React.MouseEventHandler<HTMLButtonElement> | undefined;
}

export const MiddleBar = React.memo(
  ({ leftButtonClicked, rightButtonClicked }: TMiddleBarProps) => {
    const { t } = useTranslation();
    const [count, setCount] = useState<number>(0);
    const {
      username,
      definedUsername,
      isInGameQueue,
      isConnected,
      isAuthLoading,
      isStarknetID,
      RTR,
    } = useGStore(
      useShallow((state) => ({
        username: state.username,
        definedUsername: state.definedUsername,
        isInGameQueue: state.isInGameQueue,
        isConnected: state.isConnected,
        isAuthLoading: state.isAuthLoading,
        isStarknetID: state.isStarknetID,
        RTR: state.readyToRender3,
      })),
    );
    const isInGame = useGStore((state) => state.isInGame);

    const { handleOpen } = useOpenConnexionModal();

    const { infoText, isValid, setInfoText, setIsValidState } =
      useGenerateInfoText(username, definedUsername, isStarknetID);

    useDeathAndUsernameChecking(isInGame, isConnected, setCount);
    useCounter(count, setCount);

    const counter = count > 0;

    const [delayedInteraction, setDelayedInteraction] = useState(true);
    useEffect(() => {
      const timeoutId = setTimeout(() => {
        setDelayedInteraction(false);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }, []);

    const buttonContent = useMemo(() => {
      if (isAuthLoading || delayedInteraction)
        return <Loader2 className="animate-spin text-black" />;
      if (!isConnected)
        return (
          <>
            <Play className="fill-current" /> {t("buttons.play")}
          </>
        );
      if (!definedUsername)
        return (
          <>
            <Check /> {t("common.confirm")}
          </>
        );
      if (counter) return count;
      if (isInGameQueue)
        return (
          <>
            <LogOut /> {t("queue.leaveQueue")}
          </>
        );
      if (isInGame)
        return (
          <>
            <Play className="fill-current" /> {t("buttons.resume")}
          </>
        );

      return (
        <>
          <Play className="fill-current" /> {t("buttons.play")}
        </>
      );
    }, [
      isAuthLoading,
      delayedInteraction,
      isConnected,
      definedUsername,
      counter,
      count,
      isInGameQueue,
      isInGame,
      t,
    ]);

    const isDisabled =
      (isConnected && (!isValid || counter)) || delayedInteraction;

    const handleClick = (
      e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    ): void => {
      if (isConnected) {
        if (!definedUsername) {
          if (containsProfanity(username)) {
            setIsValidState(false);
            setInfoText(t("validation.username.profanity"));
            return;
          }
          postUsername(username)
            .then(() => {
              SAG.setDefinedUsername(true);
              setNewUsernameToWS();
            })
            .catch((err) => {
              setIsValidState(false);
              if (err.response.status === 409) {
                setInfoText(t("validation.username.alreadyTaken"));
              } else {
                setInfoText(t("validation.username.unexpected"));
              }
            });
          return;
        }
        if (leftButtonClicked) leftButtonClicked(e);
      } else {
        handleOpen();
      }
    };

    const actionBtn =
      "min-w-0 flex-1 basis-0 font-bold uppercase shadow-[0_0_20px_5px_rgba(14,198,48,0.4)] transition-all hover:scale-[1.05] hover:shadow-[0_0_30px_8px_rgba(14,198,48,0.6)]";

    return (
      <div className="flex w-[296px] flex-col gap-3 rounded-md bg-black/40 p-3 backdrop-blur-sm sm:w-[305px] md:w-[310px]">
        {isConnected && isInGameQueue && <QueueDisplayer />}
        <UsernameDisplayer
          isValid={isValid}
          infoText={infoText}
          isConnected={isConnected}
        />

        <div className="flex w-full items-stretch gap-2">
          <Button
            onClick={handleClick}
            disabled={isDisabled || (!RTR && isConnected)}
            className={actionBtn}
          >
            {buttonContent}
          </Button>

          {isInGame ? (
            <Button
              variant="outline"
              onClick={rightButtonClicked}
              disabled={!RTR}
              className="min-w-0 flex-1 basis-0 capitalize"
            >
              <LogOut /> {t("buttons.quitGame")}
            </Button>
          ) : (
            <ViewerState rightButtonClicked={rightButtonClicked} />
          )}
        </div>

        <PostTransitionAction />
      </div>
    );
  },
);
