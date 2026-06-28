import React, { useMemo } from "react";
import { extend } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";
import { useCurrentLayer } from "../../hooks/useCurrentLayer";
import { type T3DP } from "../../Types/T3DP";

type CoolFogMaterialUniforms = {
  time: number;
  color: THREE.Color;
  fogCenter: THREE.Vector3;
  fogRadius: number;
  noiseScale: number;
};

const CoolFogMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.0, 0.5, 0.1),
    fogCenter: new THREE.Vector3(0, 0, 0),
    fogRadius: 5,
    noiseScale: 0.1,
  },
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vPos;
    void main() {
      vUv = uv;
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform float time;
    uniform vec3 color;
    uniform vec3 fogCenter;
    uniform float fogRadius;
    uniform float noiseScale;
    varying vec2 vUv;
    varying vec3 vPos;

    // Simple noise function
    float noise(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    
    void main() {
      vec3 fogColor = color;
      float dist = distance(vPos.xz, fogCenter.xz) / fogRadius;
      
      // Create noise based on position and time
      float noiseValue = noise(vPos.xz * noiseScale + time * 0.1);
      
      // Inverse fog factor (more dense in center, less on borders)
      float fogFactor = 1.0 - smoothstep(0.0, 1.0, dist);
      
      // Apply noise to fog factor
      fogFactor *= mix(0.5, 1.0, noiseValue);
      
      // Add some vertical variation
      fogFactor *= sin(time * 0.5 + vPos.y * 0.2) * 0.05 + 0.4;
      
      gl_FragColor = vec4(fogColor, fogFactor);
    }
  `,
);

// Apply additional properties to the material
(CoolFogMaterial as any).transparent = true;
(CoolFogMaterial as any).side = THREE.DoubleSide;

(CoolFogMaterial as any).depthWrite = false;

extend({ CoolFogMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    coolFogMaterial: ThreeElements["shaderMaterial"] & CoolFogMaterialUniforms;
  }
}

interface CoolFogProps {
  position: [number, number, number];
  scale: [number, number, number];
  color: THREE.Color;
  fogCenter: THREE.Vector3;
  fogRadius: number;
  noiseScale: number;
  cylinderArgs?: [number, number, number];
  rotation?: [number, number, number];
  toggleMat?: boolean;
}

const DEFAULT_CYLINDER_ARGS: [number, number, number] = [10, 10, 32];
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0];

const SCALE_UNIT: [number, number, number] = [1, 1, 1];
const SCALE_BIG_FOG: [number, number, number] = [200, 1, 200];
const ROTATION_HALF_PI_Y: [number, number, number] = [0, Math.PI / 2, 0];

const FOG2_POS_1: [number, number, number] = [27, 55.3, -24];
const FOG2_POS_2: [number, number, number] = [27, 55.3, -62];
const FOG2_POS_3: [number, number, number] = [236, 55.3, -62];
const FOG2_POS_4: [number, number, number] = [236, 55.3, -24];
const FOG2_POS_5: [number, number, number] = [154, 55.3, -76];
const FOG2_POS_6: [number, number, number] = [89, 55.3, -102];
const FOG_POS_TOP: [number, number, number] = [100, 420, -50];

const CoolFog: React.FC<CoolFogProps> = React.memo(
  ({
    position,
    scale,
    color,
    fogCenter,
    fogRadius,
    noiseScale,
    cylinderArgs = DEFAULT_CYLINDER_ARGS,
  }) => {
    const coolFogMaterial = useMemo(() => {
      const materialClone = new CoolFogMaterial().clone();

      materialClone.color = color;
      materialClone.fogCenter = fogCenter;
      materialClone.fogRadius = fogRadius;
      materialClone.noiseScale = noiseScale;
      materialClone.transparent = true;
      materialClone.side = THREE.DoubleSide;
      return materialClone;
    }, [color, fogCenter, fogRadius, noiseScale]);
    const cylinderGeometry = useMemo(() => {
      return new THREE.CylinderGeometry(
        cylinderArgs[0],
        cylinderArgs[1],
        cylinderArgs[2],
      );
    }, [cylinderArgs]);
    return (
      <mesh
        args={[cylinderGeometry, coolFogMaterial]}
        position={position}
        scale={scale}
      />
    );
  },
);

const CoolFog2: React.FC<CoolFogProps> = React.memo(
  ({
    position,
    scale,
    color,
    fogCenter,
    fogRadius,
    noiseScale,
    rotation = DEFAULT_ROTATION,
    toggleMat,
  }) => {
    return (
      <mesh position={position} rotation={rotation as T3DP} scale={scale}>
        <boxGeometry args={[16.2, 10, 12.2]} />
        {toggleMat ? (
          // @ts-expect-error r3f extend-registered material, props are uniforms
          <coolFogMaterial
            color={color}
            fogCenter={fogCenter}
            fogRadius={fogRadius}
            noiseScale={noiseScale}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
          />
        ) : (
          <meshStandardMaterial
            color={new THREE.Color(0.0, 0.0, 0.0)}
            opacity={0.9}
            transparent
          />
        )}
      </mesh>
    );
  },
);

export const Fogs: React.FC = () => {
  const layer = useCurrentLayer();
  const color = useMemo(() => new THREE.Color(0.0, 0.6, 0.2), []);
  const zeroVector = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  return (
    <>
      <CoolFog2
        position={FOG2_POS_1}
        scale={SCALE_UNIT}
        color={color}
        fogCenter={zeroVector}
        fogRadius={16}
        noiseScale={0.01}
        toggleMat={layer >= 5 && layer < 7}
      />

      <CoolFog2
        position={FOG2_POS_2}
        scale={SCALE_UNIT}
        color={color}
        fogCenter={zeroVector}
        fogRadius={16}
        noiseScale={0.01}
        toggleMat={layer >= 4 && layer < 7}
      />

      <CoolFog2
        position={FOG2_POS_3}
        scale={SCALE_UNIT}
        color={color}
        fogCenter={zeroVector}
        fogRadius={16}
        noiseScale={0.01}
        toggleMat={layer >= 3 && layer < 7}
      />

      <CoolFog2
        position={FOG2_POS_4}
        scale={SCALE_UNIT}
        color={color}
        fogCenter={zeroVector}
        fogRadius={16}
        noiseScale={0.01}
        toggleMat={layer >= 2 && layer < 7}
      />

      <CoolFog2
        position={FOG2_POS_5}
        rotation={ROTATION_HALF_PI_Y}
        scale={SCALE_UNIT}
        color={color}
        fogCenter={zeroVector}
        fogRadius={16}
        noiseScale={0.01}
        toggleMat={layer >= 1 && layer < 7}
      />

      <CoolFog2
        position={FOG2_POS_6}
        rotation={ROTATION_HALF_PI_Y}
        scale={SCALE_UNIT}
        color={color}
        fogCenter={zeroVector}
        fogRadius={16}
        noiseScale={0.01}
        toggleMat={layer < 7}
      />

      <CoolFog
        position={FOG_POS_TOP}
        scale={SCALE_BIG_FOG}
        color={new THREE.Color(0.5, 0.05, 0.05)}
        fogCenter={zeroVector}
        fogRadius={1}
        noiseScale={0.1}
      />

      {/* Add other scene elements here */}
    </>
  );
};
