import * as React from "react";
import { useGStore } from "../../../useGeneralStore";
import { useTranslation } from "react-i18next";

export const QueueDisplayer: React.FC = () => {
  const { t } = useTranslation();
  const gameQueuePos = useGStore((state) => state.gameQueuePos);

  return (
    <p className="text-center text-sm text-foreground">
      {t("ui.labels.positionInQueue")}
      {gameQueuePos ? ` ${gameQueuePos}` : t("ui.status.loading")}
    </p>
  );
};
