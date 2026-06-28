import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { type TMesh } from "../../../Types/TMesh";
import { CICollisionFinder } from "../../../players/model/findIntersection";
import emitter from "../../../helpers/EventEmitter";
import { CISoundMng } from "../../../sound/soundFX";
import { SGG } from "../../../menu/useGeneralStore";
import { perspectiveCam, shaderMat } from "../../../helpers/threeTypeHelpers";

let startTimer = 0;
const v3Pos = new THREE.Vector3();
const CameraOffset = new THREE.Vector3(0, -0.11, 0);
const targetPos = new THREE.Vector3();
const midPoint = new THREE.Vector3();
const direction = new THREE.Vector3();

export const Electricity = () => {
  const planeRef = useRef<TMesh>(null!);

  useEffect(() => {
    const onCubeDPlayer = () => {
      startTimer = performance.now();
      CISoundMng?.soundsFx.electricSound.updateSound();
      v3Pos.set(...CICollisionFinder.lastAggressive);
    };
    const listener = emitter.addListener("voxelAggressive", onCubeDPlayer);
    return () => listener.remove();
  }, []);

  const { size, camera } = useThree();

  useFrame(() => {
    if (!planeRef.current || !SGG.getIsInGame()) return;

    const diffTime = performance.now() - startTimer;
    planeRef.current.visible = diffTime <= 500;
    if (!planeRef.current.visible) return;

    // Update the shader time uniform
    shaderMat(planeRef.current).uniforms.iTime.value = diffTime / 1000;

    targetPos.copy(camera.position).add(CameraOffset);
    midPoint.addVectors(v3Pos, targetPos).multiplyScalar(0.5);
    planeRef.current.position.copy(midPoint);

    direction.subVectors(targetPos, v3Pos).normalize();
    planeRef.current.lookAt(midPoint.clone().add(direction));
    planeRef.current.rotateX(-Math.PI / 2);
    if (direction.y < -0.95) {
      planeRef.current.rotateX(Math.PI / 8);
    }

    const heightScale = v3Pos.distanceTo(targetPos);
    planeRef.current.scale.set(1, heightScale, 1);
    planeRef.current.updateMatrix();
  }, 3);

  useEffect(() => {
    if (!planeRef.current) return;
    planeRef.current.visible = false;
    planeRef.current.matrixAutoUpdate = false;
    shaderMat(planeRef.current).uniforms.iResolution.value = new THREE.Vector2(
      size.width,
      size.height,
    );
  }, [size.height, size.width]);

  return (
    <>
      <HUDElectricity translate={2.1} />
      <HUDElectricity translate={-2.1} />
      <mesh ref={planeRef} frustumCulled={false}>
        <planeGeometry attach="geometry" args={[0.4, 1]} />
        {/*
          // @ts-expect-error */}
        <electricityMaterial />
      </mesh>
    </>
  );
};

const HUDElectricity = ({ translate }: { translate: number }) => {
  const planeRef = useRef<TMesh>(null!);
  const { size, camera } = useThree();
  const distance = 0.2;

  useFrame(() => {
    if (!planeRef.current || !SGG.getIsInGame()) return;

    const diffTime = performance.now() - startTimer;
    planeRef.current.visible = diffTime <= 500;
    if (!planeRef.current.visible) return;

    shaderMat(planeRef.current).uniforms.iTime.value = diffTime / 1000;

    planeRef.current.position.copy(camera.position);
    planeRef.current.quaternion.copy(camera.quaternion);
    planeRef.current.translateZ(-distance);

    const leftOffset = calculateLeftOffset(
      size.width,
      size.height,
      perspectiveCam(camera).fov,
      translate,
    );
    planeRef.current.translateX(-leftOffset);

    planeRef.current.updateMatrix();
    planeRef.current.updateMatrixWorld();
  }, 3);

  useEffect(() => {
    planeRef.current.visible = false;
    planeRef.current.matrixAutoUpdate = false;
    const fov = perspectiveCam(camera).fov;
    const vFov = (fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const aspectRatio = size.width / size.height;
    const width = height * aspectRatio;

    planeRef.current.scale.set(width, height, 1);
    shaderMat(planeRef.current).uniforms.iResolution.value = new THREE.Vector2(
      size.width,
      size.height,
    );
  }, [camera, size.width, size.height]);

  return (
    <mesh ref={planeRef} frustumCulled={false}>
      <planeGeometry attach="geometry" args={[1, 1]} />
      {/*
        // @ts-expect-error */}
      <electricityMaterialPlane />
    </mesh>
  );
};

function calculateLeftOffset(
  viewportWidth: number,
  viewportHeight: number,
  fov: number,
  translate: number,
) {
  const height = translate * Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 0.2;
  const width = height * (viewportWidth / viewportHeight);
  return width / 2;
}
