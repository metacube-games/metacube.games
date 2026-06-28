import { useEffect, useState } from "react";
import emitter from "../helpers/EventEmitter";
import { CIMetacubeStates } from "../world/model/MetacubeStates";

/**
 * Subscribes to the current Metacube layer.
 *
 * Reads the initial value synchronously from CIMetacubeStates, re-reads it once
 * on mount (covering layers set between the initial render and effect commit),
 * then keeps it in sync via the "initLayer" / "changeLayer" emitter events.
 * Both listeners are removed on cleanup.
 */
export function useCurrentLayer(): number {
  const [layer, setLayer] = useState(() => CIMetacubeStates.getCurrLayer());

  useEffect(() => {
    setLayer(CIMetacubeStates.getCurrLayer());
    const onLayer = (nextLayer: number) => {
      setLayer(nextLayer);
    };
    const list = emitter.addListener("initLayer", onLayer);
    const listener = emitter.addListener("changeLayer", onLayer);
    return () => {
      list.remove();
      listener.remove();
    };
  }, []);

  return layer;
}
