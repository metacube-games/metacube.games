import { memo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { colorGreen } from "../../../styles/colors";
import { getNextRandom } from "../../../../helpers/computedRandom";

interface ElectricityStrikeProps {
  count?: number;
  duration?: number;
}

export const ElectricityStrikes = memo(
  ({ count = 8, duration = 1.5 }: ElectricityStrikeProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const strikes = useRef<THREE.Line[]>([]);
    const glowRefs = useRef<THREE.PointLight[]>([]);
    const tempColor = useRef<THREE.Color | null>(null);
    if (tempColor.current === null)
      tempColor.current = new THREE.Color(colorGreen);

    useEffect(() => {
      if (!groupRef.current) return;
      const group = groupRef.current;
      const disposeAll = () => {
        strikes.current.forEach((s) => {
          group.remove(s);
          s.geometry.dispose();
          (s.material as THREE.Material).dispose();
        });
        glowRefs.current.forEach((g) => {
          group.remove(g);
          g.dispose();
        });
        strikes.current = [];
        glowRefs.current = [];
      };
      disposeAll();

      for (let i = 0; i < count; i++) {
        const points: THREE.Vector3[] = [];
        const segments = Math.floor(getNextRandom() * 5) + 8;
        const startX = (getNextRandom() - 0.5) * 0.5;
        const startY = 1 + getNextRandom() * 0.5;
        const startZ = (getNextRandom() - 0.5) * 0.5;
        points.push(new THREE.Vector3(startX, startY, startZ));

        let prevX = startX;
        let prevY = startY;
        let prevZ = startZ;
        const dirX = (getNextRandom() - 0.5) * 2;
        const dirZ = (getNextRandom() - 0.5) * 2;

        for (let j = 1; j <= segments; j++) {
          const t = j / segments;
          const jitter = 0.4 * (1 - t);
          const branchChance = getNextRandom();
          const x = prevX + dirX * 0.2 + (getNextRandom() - 0.5) * jitter;
          const y = prevY - 0.2 - getNextRandom() * 0.1;
          const z = prevZ + dirZ * 0.2 + (getNextRandom() - 0.5) * jitter;
          points.push(new THREE.Vector3(x, y, z));

          if (branchChance > 0.7 && j < segments - 1) {
            const branchX = x + (getNextRandom() - 0.5) * jitter * 1.5;
            const branchY = y - getNextRandom() * 0.15;
            const branchZ = z + (getNextRandom() - 0.5) * jitter * 1.5;
            points.push(new THREE.Vector3(branchX, branchY, branchZ));
            points.push(new THREE.Vector3(x, y, z));
          }
          prevX = x;
          prevY = y;
          prevZ = z;
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(colorGreen).multiplyScalar(1.5),
          transparent: true,
          opacity: 0.8,
          linewidth: 3,
        });
        const strike = new THREE.Line(geometry, material);
        strikes.current.push(strike);
        groupRef.current?.add(strike);

        const numGlowPoints = Math.min(4, points.length);
        for (let k = 0; k < numGlowPoints; k++) {
          const pointIndex = Math.floor((k * points.length) / numGlowPoints);
          const point = points[pointIndex];
          const glow = new THREE.PointLight(colorGreen, 2, 0.5, 2);
          glow.position.copy(point);
          glowRefs.current.push(glow);
          groupRef.current?.add(glow);
        }
      }

      return disposeAll;
    }, [count]);

    useFrame(({ clock }) => {
      if (!groupRef.current) return;
      const time = clock.getElapsedTime();
      const cycleTime = time % duration;
      const progress = cycleTime / duration;
      groupRef.current.rotation.y = time * 0.3;

      strikes.current.forEach((strike, i) => {
        const offset = i / count;
        const strikeProgress = (progress + offset) % 1;
        if (strike.material) {
          const flicker = Math.sin(time * 15 + i) * 0.3 + 0.7;
          const baseOpacity =
            strikeProgress < 0.5
              ? strikeProgress * 2
              : (1 - strikeProgress) * 2;
          (strike.material as THREE.LineBasicMaterial).opacity =
            baseOpacity * flicker;
        }
        const scale = 0.8 + Math.sin(strikeProgress * Math.PI) * 0.4;
        strike.scale.set(scale, scale, scale);
      });

      const color = tempColor.current;
      glowRefs.current.forEach((glow, i) => {
        const offset = i / glowRefs.current.length;
        const glowProgress = (progress + offset) % 1;
        const flicker = Math.sin(time * 20 + i * 10) * 0.5 + 0.5;
        const baseIntensity =
          glowProgress < 0.5 ? glowProgress * 4 : (1 - glowProgress) * 4;
        glow.intensity = baseIntensity * flicker * 2;
        const hueShift = Math.sin(time * 5 + i) * 0.1;
        if (!color) return;
        color.setStyle(colorGreen);
        color.offsetHSL(hueShift, 0, 0);
        glow.color.copy(color);
      });
    });

    return <group ref={groupRef} />;
  },
);
ElectricityStrikes.displayName = "ElectricityStrikes";
