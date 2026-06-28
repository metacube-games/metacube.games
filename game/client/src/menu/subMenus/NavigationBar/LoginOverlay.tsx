import * as React from "react";

export const LoginOverlay = React.memo(({ text }: { text: string }) => (
  <div className="pointer-events-auto absolute inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
    <p className="text-center text-2xl font-bold text-white [text-shadow:0_0_10px_rgba(0,0,0,0.4)]">
      {text}
    </p>
  </div>
));
LoginOverlay.displayName = "LoginOverlay";
