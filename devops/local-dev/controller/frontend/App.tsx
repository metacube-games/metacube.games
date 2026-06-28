import { useEffect, useRef, useState } from "react";
import io, { type Socket } from "socket.io-client";
import { Database, ServerCog, Wifi, WifiOff } from "lucide-react";

import { Header } from "@/components/library/header";
import { Page } from "@/components/library/page";
import { Spinner } from "@/components/library/spinner";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toaster";

import { useHashRoute } from "@/lib/use-hash-route";
import {
  ServicesView,
  type IServiceState,
  type IServiceOutput,
  type IServiceDropped,
  type ITransition,
  type TService,
} from "./views/ServicesView";
import { DatabaseView } from "./views/DatabaseView";

interface IOutput { module: TService; output: string }

let socket: Socket | undefined;
const BACKEND_URL = import.meta.env.VITE_REACT_APP_CONTROLLER_BACKEND_URL;

const ROUTES = {
  services: "#services",
  database: "#database",
} as const;

const NAV_ITEMS = [
  { href: ROUTES.services, icon: <ServerCog />, label: "Services" },
  { href: ROUTES.database, icon: <Database />,  label: "Database" },
];

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <Badge
      variant={connected ? "success" : "destructive"}
      size="lg"
      className="h-9 px-3"
    >
      {connected ? <Wifi /> : <WifiOff />}
      {connected ? "Connected" : "Disconnected"}
    </Badge>
  );
}

const App = () => {
  const route = useHashRoute(ROUTES.services);

  const [isConnected, setIsConnected]     = useState(false);
  const [states, setStates]               = useState<IServiceState>({});
  const [transitions, setTransitions]     = useState<ITransition | undefined>();
  const [outputs, setOutputs]             = useState<IServiceOutput>({});
  const [droppedCounts, setDroppedCounts] = useState<IServiceDropped>({});
  const totalReceivedRef                  = useRef<IServiceDropped>({});

  useEffect(() => {
    if (!socket) {
      socket = io(BACKEND_URL);
      socket.on("init", (data) => {
        setTransitions(data.transitions);
        setStates(data.states);
        setIsConnected(true);
      });
      socket.on("event", (data) => {
        if (data.states) setStates(data.states);
      });
      socket.on("output", (data: IOutput) => {
        const { module, output: newOutput } = data;
        totalReceivedRef.current[module] = (totalReceivedRef.current[module] || 0) + 1;
        const total = totalReceivedRef.current[module]!;
        if (total > 1000) {
          setDroppedCounts((prev) => ({ ...prev, [module]: total - 1000 }));
        }
        setOutputs((prev) => {
          const cur = prev[module] || [];
          const next = [...cur, newOutput];
          if (next.length > 1000) next.shift();
          return { ...prev, [module]: next };
        });
      });
    }
  }, []);

  function clearOutput(module: TService) {
    totalReceivedRef.current[module] = 0;
    setDroppedCounts((prev) => ({ ...prev, [module]: 0 }));
    setOutputs((prev) => ({ ...prev, [module]: [] }));
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Spinner size={16} />
        <span className="text-sm">Connecting to server…</span>
      </div>
    );
  }

  return (
    <>
      <Header
        navItems={NAV_ITEMS}
        activeHref={route}
        leftSlot={null}
        rightSlot={<ConnectionPill connected={isConnected} />}
      />

      <Page hasFooter={false}>
        {route === ROUTES.database ? (
          <DatabaseView />
        ) : (
          <ServicesView
            socket={socket}
            states={states}
            transitions={transitions}
            outputs={outputs}
            droppedCounts={droppedCounts}
            onClearOutput={clearOutput}
          />
        )}
      </Page>

      <Toaster />
    </>
  );
};

export default App;
