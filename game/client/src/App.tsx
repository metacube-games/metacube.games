import { useEffect } from "react";
import { useReferralCode, useLoadingDelayer } from "./hooks";
import { useDataFetcher } from "./API/DataFetcher";
import { CISocketMng } from "./API/socketMessagesManager";
import { CanvasComponent, HUDMenu, InterfacesMenu } from "./components";
import { NotificationsRoot } from "./menu/notifications/NotificationsRoot";

export default function App() {
  useReferralCode();
  useDataFetcher();
  useLoadingDelayer();

  // Open the viewer WebSocket once App mounts. Both connect() and
  // disconnect() are idempotent so React Strict Mode's double-mount in
  // development doesn't open two connections.
  useEffect(() => {
    CISocketMng.connect();
    return () => CISocketMng.disconnect();
  }, []);

  return (
    <>
      <CanvasComponent />
      <HUDMenu />
      <InterfacesMenu />
      <NotificationsRoot />
    </>
  );
}
