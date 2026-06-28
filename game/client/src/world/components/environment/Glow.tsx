import type { ReactElement } from "react";
import * as THREE from "three";
import { MeshWobbleMaterial } from "@react-three/drei";

export const Glow = ({
  ref,
  color,
  jsxGeo,
}: {
  ref?: any;
  color?: string;
  jsxGeo: ReactElement;
}) => {
  return (
    <mesh ref={ref}>
      {jsxGeo}
      <MeshWobbleMaterial
        color={color}
        speed={2}
        factor={0.35}
        transparent={true}
        opacity={0.4}
        side={THREE.DoubleSide}
        // time={0.5}
      />
      {/* <LayerMaterial
        side={THREE.DoubleSide}
        transparent
        depthWrite={false}
        blending={THREE.CustomBlending}
        blendEquation={THREE.AddEquation}
        blendSrc={THREE.SrcAlphaFactor}
        blendDst={THREE.DstAlphaFactor}
      >
        <Depth
          colorA={color}
          colorB="black"
          alpha={1}
          mode="normal"
          near={near * scale}
          far={far * scale}
          origin={[0, 0, 0]}
        />
        <Depth
          colorA={color}
          colorB="black"
          alpha={0.5}
          mode="add"
          near={-40 * scale}
          far={far * 1.2 * scale}
          origin={[0, 0, 0]}
        />
        <Depth
          colorA={color}
          colorB="black"
          alpha={1}
          mode="add"
          near={-15 * scale}
          far={far * 0.7 * scale}
          origin={[0, 0, 0]}
        />
        <Depth
          colorA={color}
          colorB="black"
          alpha={1}
          mode="add"
          near={-10 * scale}
          far={far * 0.68 * scale}
          origin={[0, 0, 0]}
        />
      </LayerMaterial> */}
    </mesh>
  );
};
