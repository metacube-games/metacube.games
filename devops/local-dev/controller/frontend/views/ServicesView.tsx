import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

import { Section } from "@/components/library/section";
import { StatusDot } from "@/components/library/status-dot";
import { Terminal } from "@/components/library/terminal";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type TAction = "start" | "stop" | "fill" | "clean" | "build";
export type TState =
  | "idle" | "running" | "error" | "success" | "warning" | "info"
  | "ready" | "filled" | "filling" | "processing" | "building" | "flushing";
export type TService =
  | "backend" | "game-client" | "db-init"
  | "game-server" | "state-server" | "view-server";

export type IServiceState   = { [K in TService]?: TState };
export type IServiceOutput  = { [K in TService]?: string[] };
export type IServiceDropped = { [K in TService]?: number };
type StateTransition = { [key in TState]?: TAction[] };
export type ITransition = { [K in TService]?: StateTransition };

const stateMap: Record<TState, {
  dot: "idle" | "running" | "error" | "processing" | "building" | "success";
  badge: "default" | "secondary" | "destructive" | "warning" | "success" | "info";
}> = {
  idle:       { dot: "idle",       badge: "secondary"  },
  running:    { dot: "running",    badge: "success"    },
  ready:      { dot: "running",    badge: "success"    },
  filled:     { dot: "success",    badge: "success"    },
  success:    { dot: "success",    badge: "success"    },
  error:      { dot: "error",      badge: "destructive" },
  processing: { dot: "processing", badge: "warning"    },
  building:   { dot: "building",   badge: "warning"    },
  filling:    { dot: "processing", badge: "warning"    },
  flushing:   { dot: "processing", badge: "warning"    },
  warning:    { dot: "processing", badge: "warning"    },
  info:       { dot: "running",    badge: "info"       },
};

const actionClass: Record<TAction, string> = {
  start: "bg-primary/10 text-primary border border-primary/40 hover:bg-primary/20 hover:text-primary",
  stop:  "bg-red-950/60   text-red-400   border border-red-900   hover:bg-red-950   hover:text-red-300",
  fill:  "bg-amber-950/60 text-amber-400 border border-amber-900 hover:bg-amber-950 hover:text-amber-300",
  clean: "bg-blue-950/60  text-blue-400  border border-blue-900  hover:bg-blue-950  hover:text-blue-300",
  build: "bg-purple-950/60 text-purple-400 border border-purple-900 hover:bg-purple-950 hover:text-purple-300",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ActionButton({
  action,
  label,
  onClick,
}: {
  action: TAction;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      className={cn("h-8 px-3 text-xs font-medium", actionClass[action])}
    >
      {label}
    </Button>
  );
}

export function ServicesView({
  socket,
  states,
  transitions,
  outputs,
  droppedCounts,
  onClearOutput,
}: {
  socket: Socket | undefined;
  states: IServiceState;
  transitions: ITransition | undefined;
  outputs: IServiceOutput;
  droppedCounts: IServiceDropped;
  onClearOutput: (m: TService) => void;
}) {
  const allModules  = Object.keys(states) as TService[];
  const gameModules = allModules.filter((m) => m === "db-init" || m === "game-client");
  const coreModules = allModules.filter((m) => m !== "db-init" && m !== "game-client");

  const actionsFor = (m: TService): TAction[] => {
    const s = states[m];
    if (!s || !transitions) return [];
    return transitions[m]?.[s] ?? [];
  };

  const renderActions = (module: TService) => {
    const actions = actionsFor(module);
    if (actions.length === 0) {
      return (
        <span className="text-xs italic text-muted-foreground">
          No actions available
        </span>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <ActionButton
            key={a}
            action={a}
            label={cap(a)}
            onClick={() => socket?.emit("action", { module, action: a })}
          />
        ))}
      </div>
    );
  };

  const renderBulkActions = (modules: TService[]) => {
    const set = new Set<TAction>();
    for (const m of modules) actionsFor(m).forEach((a) => set.add(a));
    if (set.size === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 p-4">
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          All services:
        </span>
        {Array.from(set).map((a) => (
          <ActionButton
            key={a}
            action={a}
            label={`${cap(a)} all`}
            onClick={() => {
              for (const m of modules) {
                if (actionsFor(m).includes(a)) {
                  socket?.emit("action", { module: m, action: a });
                }
              }
            }}
          />
        ))}
      </div>
    );
  };

  const renderServiceCard = (module: TService) => {
    const state = states[module] ?? "idle";
    const ui    = stateMap[state] ?? stateMap.idle;
    const lines = outputs[module] ?? [];

    return (
      <Card key={module} size="compact" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <StatusDot status={ui.dot} />
            <span className="text-sm font-semibold capitalize">
              {module.replace(/-/g, " ")}
            </span>
          </div>
          <Badge
            variant={ui.badge}
            size="lg"
            className="uppercase tracking-wider"
          >
            {state}
          </Badge>
        </div>

        <div>{renderActions(module)}</div>

        <Terminal
          lines={lines}
          droppedCount={droppedCounts[module] ?? 0}
          onClear={() => onClearOutput(module)}
        />
      </Card>
    );
  };

  return (
    <>
      {gameModules.length > 0 && (
        <Section title="Game DB & Client" stack>
          {gameModules.map(renderServiceCard)}
        </Section>
      )}

      {coreModules.length > 0 && (
        <Section title="Core Services" stack>
          {renderBulkActions(coreModules)}
          {coreModules.map(renderServiceCard)}
        </Section>
      )}
    </>
  );
}
