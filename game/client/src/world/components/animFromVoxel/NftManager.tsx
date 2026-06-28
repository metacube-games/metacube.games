import type { RefObject } from "react";
import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

import type { TMesh } from "../../../Types/TMesh";
import { shaderMat } from "../../../helpers/threeTypeHelpers";
import { CINftCardManager } from "../../managers/nftCardManager";

import { MetacubeCard } from "./MetacubeCard";

// Re-export so existing imports `from "./nftManager"` keep working.
export { CINftCardManager } from "../../managers/nftCardManager";

type TProps = {
  // refNFTCARD wraps a `<group>`, refNFTParticle a `<mesh>`. Both are typed
  // as TMesh upstream (intersectedCube.tsx) and the manager only touches
  // the Object3D-level subset (position/rotation/scale/visible/updateMatrix),
  // so we accept the imprecision here.
  refNFTCARD: RefObject<TMesh | null>;
  refNFTParticle: RefObject<TMesh | null>;
};

export function NFTAnimation({ refNFTCARD, refNFTParticle }: TProps) {
  const { size } = useThree();
  const [nftId, setNftId] = useState<string>("");

  useEffect(() => {
    if (!refNFTCARD.current || !refNFTParticle.current) return;
    refNFTParticle.current.matrixAutoUpdate = false;
    refNFTCARD.current.matrixAutoUpdate = false;
    refNFTParticle.current.visible = false;

    refNFTParticle.current.position.set(-7000, -7000, -7000);
    refNFTCARD.current.position.set(-7000, -7000, -7000);
    refNFTParticle.current.updateMatrix();
    refNFTCARD.current.updateMatrix();
    const updateNftId = (id: string) => setNftId(id);

    CINftCardManager.subscribeToNftIdChange(updateNftId);
    return () => {
      CINftCardManager.unsubscribeFromNftIdChange(updateNftId);
    };
  }, [refNFTCARD, refNFTParticle]);

  useEffect(() => {
    if (!refNFTParticle.current) return;
    shaderMat(refNFTParticle.current).uniforms.iResolution.value =
      new THREE.Vector2(size.width, size.height);
  }, [size.height, size.width, refNFTParticle]);

  const nftPath = nftId ? `https://felts.xyz/v1/g/${nftId}.glb` : "";

  return (
    <>
      <group ref={refNFTCARD}>
        <MetacubeCard nftPath={nftPath} />
      </group>

      <mesh ref={refNFTParticle} frustumCulled={false}>
        <planeGeometry attach="geometry" args={[1.2, 1.2]} />
        {/* @ts-expect-error r3f extend-registered material */}
        <particleMaterial />
      </mesh>
    </>
  );
}
