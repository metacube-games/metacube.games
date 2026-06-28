import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CIMainViewer } from "../model/viewerMode";
import { workerPool } from "../../world/model/WorkerPool";
import { CIHUD } from "../../menu/HUD/hudInfo";
import { type TMesh } from "../../Types/TMesh";
let intCreated = false;

export const ViewerR = React.memo(({ isDesktop }: { isDesktop: boolean }) => {
  const { camera } = useThree();
  const refMesh = useRef<TMesh>(null!);
  const prevTime = useRef<number>(undefined!);
  if (prevTime.current === undefined) prevTime.current = performance.now();

  // launch function 45 times per second
  useEffect(() => {
    if (intCreated) return;

    CIMainViewer.initViewer();
    refMesh.current.updateMatrix();
    refMesh.current.visible = false;
    refMesh.current.matrixAutoUpdate = false;
    refMesh.current.getWorldPosition(camera.position);

    intCreated = true;

    const interval = setInterval(() => {
      if (refMesh.current) {
        const elapsedTime = performance.now();
        const delta = (elapsedTime - prevTime.current) / 1000;
        CIMainViewer.updateGeneral(
          delta,
          refMesh.current.position.toArray(),
          camera,
          isDesktop,
        );
        refMesh.current.position.set(...CIMainViewer.position);
        refMesh.current.updateMatrix();
        prevTime.current = elapsedTime;
      }
    }, 1000 / 60);
    //clear return
    return () => {
      clearInterval(interval);
      intCreated = false;
    };
  }, [refMesh, camera, isDesktop]);

  useFrame(() => {
    refMesh.current.getWorldPosition(camera.position);
    const time = performance.now() / 1000 / 15;

    CIMainViewer.cameraHandlings(camera, refMesh, time);

    CIHUD.coordinates.setVal([
      Math.floor(camera.position.x),
      Math.floor(camera.position.y),
      Math.floor(camera.position.z),
    ]);

    if (workerPool) workerPool.sendWaitingListToWorkers(camera);
  }, 1);

  return <ViewerCamera refMesh={refMesh} />;
});

const ViewerCamera = React.memo(
  ({ refMesh }: { refMesh: React.RefObject<TMesh> }) => {
    return (
      <mesh
        ref={refMesh}
        position={CIMainViewer.position}
        quaternion={CIMainViewer.quaternion}
      />
    );
  },
);
