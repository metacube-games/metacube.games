import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { extend, useFrame } from "@react-three/fiber";
import { MeshWobbleMaterial, shaderMaterial } from "@react-three/drei";

// 2D Simplex Noise implementation (Ashima Arts/WebGL-Noise)
const SIMPLEX_NOISE = /* glsl */ `
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  // (3.0 - sqrt(3.0)) / 6.0
                      0.366025403784439,  // 0.5 * (sqrt(3.0) - 1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

// Define the shader material with logarithmic transparency
const EnhancedBlackHoleMaterial = shaderMaterial(
  {
    uTime: 0,
    uBackground: null,
  },
  /* glsl */ `
    varying vec2 vUv;
    uniform float uTime;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    precision highp float;

    varying vec2 vUv;
    uniform float uTime;
    uniform sampler2D uBackground;

    ${SIMPLEX_NOISE}

    float random2(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    vec2 swirlUV(vec2 uv, float angle) {
      vec2 center = vec2(0.5, 0.5);
      uv -= center;
      float r = length(uv);
      float a = atan(uv.y, uv.x) + angle * (1.0 - r);
      uv = r * vec2(cos(a), sin(a));
      uv += center;
      return uv;
    }

    void main() {
      vec2 uv = vUv;
      float dist = length(uv - 0.5);

      // Compute lensed UV for background
      float lensStrength = 0.5;
      vec2 offset = normalize(uv - 0.5) * lensStrength / (dist + 0.1);
      vec2 lensUV = uv + offset;
      vec3 lensedBackground = texture2D(uBackground, lensUV).rgb;

      vec3 color = vec3(0.0);

      float eventHorizon = 0.3;
      if (dist < eventHorizon) {
        // Inside event horizon, show black
        color = vec3(0.0);
      } else {
        // Outside, show lensed background
        color = lensedBackground;
      }

      // Add photon ring
      float photonRing = smoothstep(0.29, 0.3, dist) - smoothstep(0.3, 0.31, dist);
      color += vec3(1.0) * photonRing * 2.0;

      // Add accretion disk
      float diskStart = 0.32;
      float diskEnd = 0.8;
      float disk = smoothstep(diskStart, diskStart + 0.02, dist) -
                   smoothstep(diskEnd, diskEnd + 0.02, dist);
      if (disk > 0.0) {
        float t = (dist - diskStart) / (diskEnd - diskStart);
        vec3 colorStart = vec3(0.0, 0.0, 0.0); // black
        vec3 colorMid = vec3(0.2, 0.0, 0.0);   // dark red
        vec3 colorEnd = vec3(0.5, 0.0, 0.0);   // medium red
        vec3 diskColor;
        if (t < 0.5) {
          diskColor = mix(colorStart, colorMid, t * 2.0);
        } else {
          diskColor = mix(colorMid, colorEnd, (t - 0.5) * 2.0);
        }
        // Add noise for variation
        vec2 swirledUV = swirlUV(uv, uTime * 0.2);
        float noiseVal = snoise(swirledUV * 5.0);
        diskColor *= (1.0 + 0.3 * noiseVal);
        // Add to color
        color += diskColor * disk * 0.8;
      }

      // Add dark matter specks orbiting
      float speckAngle = uTime * 0.1;
      mat2 rotation = mat2(cos(speckAngle), -sin(speckAngle), sin(speckAngle), cos(speckAngle));
      vec2 speckUv = rotation * (uv - 0.5) + 0.5;
      float speckRand = random2(floor(speckUv * 60.0));
      if (speckRand > 0.994) {
        color += vec3(0.7, 0.0, 0.0) * 0.4;
      }

      // Add subtle glow
      float glow = exp(-dist * 5.0);
      color += vec3(0.1, 0.1, 0.2) * glow * 0.5;

      // Compute logarithmic transparency
      float maxDist = 0.5; // ≈ 0.707, distance to corners
      float k = 0.00001; // Steepness factor for the logarithmic curve
      float alpha = 1.0 - log(1.0 + k * dist) / log(1.0 + k * maxDist);
      alpha = clamp(alpha, 0.0, 1.0); // Ensure alpha stays in [0, 1]

      gl_FragColor = vec4(color, alpha);
    }
  `,
);

// Register the material
extend({ EnhancedBlackHoleMaterial });

/**
 * React component that:
 * - Accepts a "backgroundTexture" for gravitational lensing
 * - Renders a plane with the black hole effect
 */
const EnhancedGiantBlackHole = React.memo(() => {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  // Update the uTime uniform on each frame
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (materialRef.current) (materialRef.current as any).uTime = time;
  });

  const textureM = useMemo(() => {
    return new THREE.Texture();
  }, []);

  useEffect(() => () => textureM.dispose(), [textureM]);

  return (
    <>
      <mesh position={[-1900, 700, 128]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2000, 2000]} />
        {/* @ts-expect-error */}
        <enhancedBlackHoleMaterial
          ref={materialRef}
          side={THREE.DoubleSide}
          transparent={true}
          uBackground={textureM}
        />
      </mesh>
      <mesh position={[-2100, 700, 128]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[560, 560, 128, 128]} />
        <MeshWobbleMaterial
          color={"#aa0000"}
          opacity={0.15}
          transparent={true}
          side={THREE.DoubleSide}
          speed={0.7}
          factor={2}
        />
      </mesh>

      <mesh
        position={[-2350, 690, 128]}
        // Rotate so the cylinder extends “into” the screen along Z
        rotation={[Math.PI * 0.5, 0, Math.PI * 0.5]}
      >
        {/*
        args:
         1) top radius    = 580
         2) bottom radius = 580
         3) height        = 1000 (how “deep” the wormhole goes)
         4) radial segments
         5) height segments
         6) openEnded     = true (no caps, so you can look down the wormhole)
      */}
        <cylinderGeometry args={[580, 580, 1000, 32, 1, true]} />

        {/* 
        Wobble material for the “wavy” distortion.
        Increase factor for more wobble amplitude,
        or increase speed for faster animation.
      */}
        <MeshWobbleMaterial
          color="#aa0000"
          opacity={0.2}
          transparent={true}
          side={THREE.DoubleSide}
          speed={0.5}
          factor={2}
        />
      </mesh>
    </>
  );
});

export default EnhancedGiantBlackHole;
