import React, { useEffect, useRef, useMemo } from "react";
import { colorBlackT0, colorGreen } from "../styles/colors";
import { METACUBE_LOGO_PATH } from "../HUD/CoinSvg";
import { CIMetacubeStates } from "../../world/model/MetacubeStates";
import { CILoading } from "../../world/model/Loading";
import { useGStore } from "../useGeneralStore";
import { useTranslation } from "react-i18next";

export const LogoDynamicBar = React.memo(() => {
  const { t } = useTranslation();
  const RTR = useGStore((state) => state.readyToRender3);
  const menuDisplay = useGStore((state) => state.menuDisplay);
  const offsetRef = useRef(0);
  const stopRef = React.useRef<SVGStopElement>(null);
  const stopRef2 = React.useRef<SVGStopElement>(null);
  const progressText = useRef<HTMLHeadingElement>(null!);

  const offset = RTR ? 1 : 0;

  const loadingMessages = useMemo(
    () => ({
      first: t("common.loading"),
      second: t("queue.connectingToServer"),
      launching: t("walletDeploy.connected"),
    }),
    [t],
  );

  useEffect(() => {
    if (RTR) {
      const onCubeLeft = () => {
        const progress = CIMetacubeStates.nbCubePercentage();
        stopRef.current?.setAttribute("offset", `${progress}%`);
        stopRef2.current?.setAttribute("offset", `${progress}%`);
      };
      const listener = CIMetacubeStates.nbCubeLeft.addListener(onCubeLeft);

      CIMetacubeStates.sendEvent();

      return () => listener.remove();
    } else {
      const onDownloadProgress = (progress: number) => {
        const progressCur = progressText.current;
        if (progressCur === null) return;
        offsetRef.current = Math.max(offsetRef.current, progress);
        progress = offsetRef.current;
        stopRef.current?.setAttribute("offset", `${0.9 * progress}%`);
        stopRef2.current?.setAttribute("offset", `${0.9 * progress}%`);

        if (
          progress >= 100 &&
          progressCur.textContent === loadingMessages.second
        ) {
          progressCur.textContent = loadingMessages.launching;
        } else if (
          progress > 50 &&
          progressCur.textContent === loadingMessages.first
        ) {
          progressCur.textContent = loadingMessages.second;
        } else if (
          progress <= 50 &&
          progressCur.textContent !== loadingMessages.first
        ) {
          progressCur.textContent = loadingMessages.first;
        }
      };
      const listener =
        CILoading.loadingProgress.addListener(onDownloadProgress);
      return () => listener.remove();
    }
  }, [RTR, loadingMessages]);

  useEffect(() => {
    if (!RTR && progressText.current) {
      progressText.current.textContent = loadingMessages.first;
    }
  }, [loadingMessages, RTR]);

  if (!menuDisplay) return null;
  return (
    <div className="flex flex-col items-center gap-6">
      <MetacubeLogo
        stopRef={stopRef}
        stopRef2={stopRef2}
        offset={offset}
        addClass={RTR ? "destroying" : "filling"}
      />
      {RTR ? (
        <h1 className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold uppercase tracking-widest text-foreground [filter:drop-shadow(0_0_2px_hsl(var(--foreground)))]">
          Metacube
        </h1>
      ) : (
        <h5
          ref={progressText}
          aria-live="polite"
          className="max-w-[90vw] break-words px-2 text-center text-sm sm:text-base md:text-xl lg:text-2xl text-foreground [text-shadow:0_0_5px_rgba(0,0,0,0.6)]"
        >
          {loadingMessages.first}
        </h5>
      )}
    </div>
  );
});

LogoDynamicBar.displayName = "LogoDynamicBar";

const MetacubeLogo = ({
  stopRef,
  stopRef2,
  offset,
  addClass,
}: {
  stopRef: React.RefObject<SVGStopElement | null>;
  stopRef2: React.RefObject<SVGStopElement | null>;
  offset: number;
  addClass: string;
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-31.5 0 501 501"
      preserveAspectRatio="xMidYMid meet"
      className="h-36 w-36 overflow-visible sm:h-48 sm:w-48 md:h-60 md:w-60 [filter:drop-shadow(0_0_12px_#0ec630)]"
    >
      <defs>
        <linearGradient id="half_grad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop ref={stopRef} offset={offset} stopColor={colorGreen} />
          <stop ref={stopRef2} offset={offset} stopColor={colorBlackT0} />
        </linearGradient>
      </defs>
      <path
        className={addClass}
        id="bar"
        fillRule="evenodd"
        fill="url(#half_grad)"
        d={METACUBE_LOGO_PATH}
      />
    </svg>
  );
};
