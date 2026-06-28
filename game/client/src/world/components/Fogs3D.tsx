import React, { useRef } from "react";
import { extend, useFrame } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import * as THREE from "three";

type FogMaterialUniforms = {
  time: number;
  color: THREE.Color;
  fogDensity: number;
  noiseScale: number;
  windSpeed: number;
};

const FogMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.8, 0.8, 0.8),
    fogDensity: 0.05,
    noiseScale: 0.1,
    windSpeed: 0.05,
  },
  /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform float time;
    uniform vec3 color;
    uniform float fogDensity;
    uniform float noiseScale;
    uniform float windSpeed;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // Improved noise function (3D)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    void main() {
      vec3 fogColor = color;
      
      // Create moving fog effect
      vec3 noiseInput = vWorldPosition * noiseScale + vec3(time * windSpeed, 0.0, time * windSpeed * 0.5);
      float noiseValue = snoise(noiseInput);
      
      // Height-based density
      // float heightFactor = smoothstep(0.0, 10.0, vWorldPosition.y);
      float density = fogDensity;
      // mix(fogDensity, 0.0, heightFactor);
      
      // Apply noise to fog density
      density *= mix(0.5, 1.0, noiseValue);
      
      // Fade out at the edges
      float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(0.0, 0.2, vUv.y) * 
                       smoothstep(0.0, 0.2, 1.0 - vUv.x) * smoothstep(0.0, 0.2, 1.0 - vUv.y);
      density *= edgeFade;
      
      gl_FragColor = vec4(fogColor, density);
    }
  `,
);

// Apply additional properties to the material
(FogMaterial as any).transparent = true;
(FogMaterial as any).side = THREE.DoubleSide;
(FogMaterial as any).depthWrite = false;

extend({ FogMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    fogMaterial: ThreeElements["shaderMaterial"] & FogMaterialUniforms;
  }
}

interface FogProps {
  position: [number, number, number];
  scale: [number, number, number];
  color: THREE.Color;
  fogDensity: number;
  noiseScale: number;
  windSpeed: number;
  children: React.ReactNode;
}

const SCALE_UNIT: [number, number, number] = [1, 1, 1];
const FOG_POS_1: [number, number, number] = [128, 0.6, -30];
const FOG_POS_2: [number, number, number] = [128, 0.2, -77];
const FOG_POS_3: [number, number, number] = [128, -200, 128];

const Fog: React.FC<FogProps> = React.memo(
  ({ position, scale, color, fogDensity, noiseScale, windSpeed, children }) => {
    const materialRef = useRef<THREE.ShaderMaterial | null>(null);

    useFrame(({ clock }) => {
      if (materialRef.current) {
        materialRef.current.uniforms.time.value = clock.getElapsedTime();
      }
    });

    return (
      <mesh
        position={position}
        scale={scale}
        frustumCulled={false}
        visible
        rotation={[-Math.PI / 2, 0, 0]}
      >
        {children}
        {/* @ts-expect-error r3f extend-registered material, props are uniforms */}
        <fogMaterial
          ref={materialRef}
          color={color}
          fogDensity={fogDensity}
          noiseScale={noiseScale}
          windSpeed={windSpeed}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  },
);

export const Fogs3D: React.FC = () => (
  <>
    <Fog
      position={FOG_POS_1}
      scale={SCALE_UNIT}
      color={new THREE.Color(0.2, 0.5, 0.2)}
      fogDensity={0.3}
      noiseScale={0.3}
      windSpeed={0.3}
    >
      <planeGeometry args={[250, 70]} />
    </Fog>
    <Fog
      position={FOG_POS_2}
      scale={SCALE_UNIT}
      color={new THREE.Color(0.2, 0.5, 0.2)}
      fogDensity={0.3}
      noiseScale={0.3}
      windSpeed={0.3}
    >
      <planeGeometry args={[182, 25]} />
    </Fog>

    <Fog
      position={FOG_POS_3}
      scale={SCALE_UNIT}
      color={new THREE.Color(0.2, 0.2, 0.2)}
      fogDensity={0.45}
      noiseScale={0.015}
      windSpeed={0.15}
    >
      <planeGeometry args={[3000, 3000]} />
    </Fog>

    {/* <Fog
      position={[128, 500, -40]}
      scale={[1, 1, 1]}
      color={new THREE.Color(0.2, 0.5, 0.2)}
      fogDensity={0.5}
      noiseScale={0.1}
      windSpeed={0.1}
      planeArgs={[300, 90]}
    /> */}
    {/* <Fog
      position={[128, 0.8, -40]}
      scale={[1, 1, 1]}
      color={new THREE.Color(0.2, 0.5, 0.2)}
      fogDensity={0.5}
      noiseScale={0.1}
      windSpeed={0.1}
      planeArgs={[300, 110]}
    /> */}
    {/* Add other scene elements here */}
  </>
);
