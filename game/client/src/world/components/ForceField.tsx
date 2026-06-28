import { MeshWobbleMaterial } from "@react-three/drei";
import React from "react";

export const ForceFieldShield = React.memo(() => {
  return (
    <>
      <mesh position={[192, 450, -83]} rotation={[0, 0, Math.PI / 2]}>
        <sphereGeometry args={[8, 8, 8]} />
        <MeshWobbleMaterial
          transparent
          opacity={0.8}
          color={0x992241}
          factor={32}
          speed={0.1}
        />
      </mesh>
      <mesh position={[192, 450, -17]} rotation={[0, 0, Math.PI / 2]}>
        <sphereGeometry args={[8, 8, 8]} />
        <MeshWobbleMaterial
          transparent
          opacity={0.8}
          color={0x992241}
          factor={32}
          speed={0.1}
        />
      </mesh>
    </>
  );
});
