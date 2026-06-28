import React, { useEffect } from "react";
import { useGStore } from "../menu/useGeneralStore";
import { CILoading } from "../world/model/Loading";

export function useLoadingDelayer() {
  const readyToRender = useGStore((state) => state.readyToRender);
  const readyToRender2 = useGStore((state) => state.readyToRender2);
  const it = 10;
  const weight = 100;
  const timeoutsRef = React.useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (readyToRender) {
      if (readyToRender2) {
        CILoading.loadingProgress.sendEvent(111);
        return () => {
          timeoutsRef.current.forEach(clearTimeout);
          timeoutsRef.current = [];
        };
      }
      for (let i = 0; i < it; i++) {
        timeoutsRef.current.push(
          setTimeout(() => {
            CILoading.loadingProgress.sendEvent(101 + ((i + 1) / it) * 10);
          }, i * weight),
        );
      }
    }
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // readyToRender2 intentionally excluded from deps; the effect re-runs only
    // when readyToRender changes (one-shot on render-ready). readyToRender2 is
    // still read reactively via the selector above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyToRender]);
}
