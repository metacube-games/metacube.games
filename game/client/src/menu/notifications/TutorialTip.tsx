import { useCallback, useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getIsDesktop } from "../../helpers/getIsDesktop";
import { SGG } from "../useGeneralStore";
import { colorGreen, colorGreenRgb } from "../styles/colors";
import {
  setDeep,
  useSelectors,
} from "../subMenus/NavigationBar/Model/notifTips/store";

const DISMISS_KEY = "C";

export function TutorialTip() {
  const { t } = useTranslation();
  const { currentNotification, saved } = useSelectors(
    "currentNotification",
    "saved",
  );
  const isDesktop = getIsDesktop();

  const shouldShow = currentNotification && saved[currentNotification] !== true;

  const dismiss = useCallback(() => {
    if (!currentNotification) return;
    setDeep(`saved.${currentNotification}`, true);
  }, [currentNotification]);

  useEffect(() => {
    if (!shouldShow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyC" || SGG.getChatFocus()) return;
      e.preventDefault();
      e.stopPropagation();
      dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shouldShow, dismiss]);

  if (!shouldShow) return null;

  return (
    <div
      className="pointer-events-auto fixed right-3 top-3 z-[999990] w-[min(92vw,360px)] rounded-md border backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(20,20,20,0.85)",
        borderColor: `rgba(${colorGreenRgb},0.5)`,
      }}
    >
      <div className="flex items-center justify-between gap-3 px-3 pt-3">
        <h3
          className="text-[14px] font-bold leading-none"
          style={{ color: colorGreen }}
        >
          {t(`ui.tutorial.${currentNotification}.title`)}
        </h3>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md p-1 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          aria-label={t("ui.tutorial.dismissAriaLabel")}
        >
          <X size={14} />
        </button>
      </div>
      <p className="px-3 py-3 text-[13px] leading-relaxed text-white/85">
        {t(`ui.tutorial.${currentNotification}.message`)}
      </p>
      <div
        className="flex justify-end px-3 py-2"
        style={{ borderTop: `1px solid rgba(${colorGreenRgb},0.2)` }}
      >
        {isDesktop ? (
          <span className="flex items-center gap-1.5 text-[11px] text-white/60">
            {t("ui.tutorial.press")}
            <span
              className="inline-flex items-center justify-center rounded-[3px] border px-1.5 font-mono text-[11px] font-bold leading-[14px]"
              style={{
                backgroundColor: "#1a1a1a",
                borderColor: colorGreen,
                borderRightWidth: "2px",
                borderBottomWidth: "2px",
                color: colorGreen,
                boxShadow: `0 0 6px rgba(${colorGreenRgb},0.45)`,
              }}
            >
              {DISMISS_KEY}
            </span>
            {t("ui.tutorial.toDismiss")}
          </span>
        ) : (
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md px-3 py-1 text-[12px] font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: colorGreen, color: "#0a0f0a" }}
          >
            {t("ui.tutorial.dismiss")}
          </button>
        )}
      </div>
    </div>
  );
}
