import { toast } from "react-hot-toast";

import { METACUBE_COIN_SVG2 } from "../HUD/CoinSvg";
import { colorRed } from "../styles/colors";

export function createToastPopup(
  color: string,
  text: string,
  moneyLost?: number,
) {
  const id = toast.custom(
    (tt) => (
      <div
        className="pointer-events-none rounded-md border bg-[rgba(20,20,20,0.85)] px-3 py-2 text-center backdrop-blur-sm"
        style={{
          borderColor: `color-mix(in srgb, ${color} 50%, transparent)`,
          opacity: tt.visible ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      >
        <div className="text-[15px] font-bold leading-tight text-white">
          {text}
        </div>
        {moneyLost ? (
          <div
            className="mt-1 flex items-center justify-center gap-1 text-[12px] font-semibold"
            style={{ color: colorRed }}
          >
            -{moneyLost}
            <span className="inline-flex items-center">
              {METACUBE_COIN_SVG2}
            </span>
          </div>
        ) : null}
      </div>
    ),
    { duration: 1500, position: "top-center" },
  );
  return () => toast.dismiss(id);
}
