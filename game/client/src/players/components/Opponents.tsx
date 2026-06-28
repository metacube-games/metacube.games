import { PHYSIC_SIZE, PARTICLES_COL } from "../../world/model/voxelConstants";
import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { CIOpponents } from "../model/computeOpponentsData";
import { useFrame } from "@react-three/fiber";
import { type T3DP } from "../../Types/T3DP";
import { type TINSTANCEDMESH } from "../../Types/TINSTANCEDMESH";
import {
  CParticlesManager,
  ParticlesManager,
} from "../../world/components/animFromVoxel/ParticlesManager";
import { CITextBuilder } from "../model/textBuilder";
import {
  SKIN_CONST_X,
  SKIN_CONST_Y,
} from "../../menu/subMenus/NavigationBar/SkinRotatedPreview";
import { skinsUrls } from "../../GLBImports/skinImports";
import { weaponUrls } from "../../GLBImports/weaponImports";

export const CIOpponentsParticles = new CParticlesManager(
  PARTICLES_COL,
  30,
  "box",
);

export interface skinComp {
  nodes: {
    head: any;
    body: any;
    leftArm: any;
    leftLeg: any;
    rightArm: any;
    rightLeg: any;
  };
}

interface skObj {
  head?: React.RefObject<TINSTANCEDMESH>;
  body?: React.RefObject<TINSTANCEDMESH>;
  leftArm?: React.RefObject<TINSTANCEDMESH>;
  rightArm?: React.RefObject<TINSTANCEDMESH>;
  leftLeg?: React.RefObject<TINSTANCEDMESH>;
  rightLeg?: React.RefObject<TINSTANCEDMESH>;
}
export type TNodeArr = keyof skObj;

export interface skRef {
  [key: string]: skObj;
}

export const Opponents = React.memo(() => {
  const length = 1000;
  const nbTextRender = 100;
  const skinsGLTF = Object.values(skinsUrls).map(
    // eslint-disable-next-line react-hooks/rules-of-hooks
    (u) => useGLTF(u, true, true) as unknown as skinComp,
  );
  const weaponData = useGLTF(weaponUrls.hammerUrl);
  const typedColorArray = useMemo(
    () => new Float32Array(Array.from({ length: length * 3 }, () => 1)),
    [length],
  );
  function buildParts(gltf: skinComp) {
    const { head, body, leftArm, leftLeg, rightArm, rightLeg } = gltf.nodes;
    return {
      head: {
        geometry: head.geometry,
        material: Object.assign(head.material.clone(), {
          side: THREE.FrontSide,
          vertexColors: true, // CRITICAL: Enable vertex colors for shading
        }),
        position: [SKIN_CONST_X.head, SKIN_CONST_Y.head, 0],
        arlength: length,
      },
      body: {
        geometry: body.geometry,
        material: Object.assign(body.material.clone(), {
          side: THREE.FrontSide,
          vertexColors: true, // CRITICAL: Enable vertex colors for shading
        }),
        position: [SKIN_CONST_X.body, SKIN_CONST_Y.body, 0],
        arlength: length,
      },
      leftArm: {
        geometry: leftArm.geometry,
        material: Object.assign(leftArm.material.clone(), {
          side: THREE.FrontSide,
          vertexColors: true, // CRITICAL: Enable vertex colors for shading
        }),
        position: [0, SKIN_CONST_Y.leftArm, 0],
        arlength: length,
      },
      rightArm: {
        geometry: rightArm.geometry,
        material: Object.assign(rightArm.material.clone(), {
          side: THREE.FrontSide,
          vertexColors: true, // CRITICAL: Enable vertex colors for shading
        }),
        position: [0, SKIN_CONST_Y.leftArm, 0],
        arlength: length,
      },
      leftLeg: {
        geometry: leftLeg.geometry,
        material: Object.assign(leftLeg.material.clone(), {
          side: THREE.FrontSide,
          vertexColors: true, // CRITICAL: Enable vertex colors for shading
        }),
        position: [0, SKIN_CONST_Y.leftLeg, 0],
        arlength: length,
      },
      rightLeg: {
        geometry: rightLeg.geometry,
        material: Object.assign(rightLeg.material.clone(), {
          side: THREE.FrontSide,
          vertexColors: true, // CRITICAL: Enable vertex colors for shading
        }),
        position: [0, SKIN_CONST_Y.rightLeg, 0],
        arlength: length,
      },
    };
  }
  const skinsData = useMemo(() => skinsGLTF.map(buildParts), [skinsGLTF]);
  const weapon = useMemo(() => {
    const w = weaponData.nodes.weapon as unknown as {
      geometry: THREE.BufferGeometry;
      material: THREE.MeshStandardMaterial;
    };
    // Clone material to avoid affecting cached GLTF material used by previews
    const clonedMaterial = w.material.clone();
    clonedMaterial.side = THREE.FrontSide;
    clonedMaterial.vertexColors = true; // CRITICAL: Enable vertex colors for shading
    return {
      geometry: w.geometry,
      material: clonedMaterial,
      position: [0, 0.41, 0],
      arlength: length,
      w: w,
    };
  }, [weaponData, length]);
  const geometryShadow = useMemo(
    () => new THREE.PlaneGeometry(0.7, 0.6).rotateX(-Math.PI / 2),
    [],
  );
  const materialShadow = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "black",
        side: THREE.FrontSide,
        opacity: 0.3,
        transparent: true,
      }),
    [],
  );

  const skinsRef = useRef<skRef>({});
  if (Object.keys(skinsRef.current).length === 0) {
    for (let i = 0; i < skinsData.length; i++) {
      skinsRef.current[i] = {
        head: { current: null! as TINSTANCEDMESH },
        body: { current: null! as TINSTANCEDMESH },
        leftArm: { current: null! as TINSTANCEDMESH },
        rightArm: { current: null! as TINSTANCEDMESH },
        leftLeg: { current: null! as TINSTANCEDMESH },
        rightLeg: { current: null! as TINSTANCEDMESH },
      };
    }
  }

  const refWeapon = useRef<TINSTANCEDMESH>(null!);
  const refBodyLow = useRef<TINSTANCEDMESH>(null!);
  const refShadow = useRef<TINSTANCEDMESH>(null!);
  const refText = useRef(null!);
  const arrayText = useMemo(
    () => Array.from(Array(nbTextRender).keys()),
    [nbTextRender],
  );
  const refParticles = useRef<TINSTANCEDMESH>(null!);

  // Memoize shared material to avoid recreation on every render
  const sharedSMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        toneMapped: false,
        side: THREE.FrontSide,
      }),
    [],
  );

  // Memoize low-res body material
  const lowResMaterial = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        map: skinsData[0].body.material.map,
      }),
    [skinsData],
  );

  useEffect(() => {
    CITextBuilder.textGroup = refText.current;

    // Set color attribute for all skin parts ONCE (not every render!)
    for (let i = 0; i < skinsData.length; i++) {
      Object.keys(skinsRef.current[i]).forEach((part) => {
        const currPart = skinsRef.current[i][part as TNodeArr];
        if (!currPart?.current) return;
        currPart.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        currPart.current.count = 0;

        // Set color attribute once here instead of every render
        const skinPart = skinsData[i][part as TNodeArr];
        if (skinPart?.geometry) {
          skinPart.geometry.setAttribute(
            "color",
            new THREE.InstancedBufferAttribute(typedColorArray, 3),
          );
        }
      });
    }
    if (refWeapon.current) {
      refWeapon.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      refWeapon.current.count = 0;
      // Set color attribute for weapon geometry (needed for vertexColors)
      if (weapon.geometry) {
        weapon.geometry.setAttribute(
          "color",
          new THREE.InstancedBufferAttribute(typedColorArray, 3),
        );
      }
    }
    if (refBodyLow.current) {
      refBodyLow.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      refBodyLow.current.count = 0;
    }
    if (refShadow.current) {
      refShadow.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      refShadow.current.count = 0;
    }
    if (refParticles.current) {
      refParticles.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      refParticles.current.count = 0;
    }
  }, [skinsData, weapon, typedColorArray]);
  let oldTime = performance.now();
  useFrame((state) => {
    if (!refWeapon.current || !skinsRef.current || !refText.current) return;
    CIOpponents.update(
      skinsRef,
      refWeapon,
      refBodyLow,
      refShadow,
      refText,
      nbTextRender,
      state.camera,
    );
    const camera = state.camera;
    const elapsedTime = performance.now();
    let diffTime = (elapsedTime - oldTime) / 1000;
    oldTime = elapsedTime;
    if (!refParticles.current) return;
    CIOpponentsParticles.update(refParticles.current, diffTime, camera);
  }, 2);

  return (
    <>
      {skinsData.map((skin, i) => {
        return Object.keys(skin).map((partName) => {
          const part = skin[partName as TNodeArr];
          return (
            <instancedMesh
              key={`skin-${i}-${partName}`}
              ref={skinsRef.current[i][partName as TNodeArr]}
              args={[part.geometry, part.material, part.arlength]}
              position={part.position as T3DP}
              frustumCulled={false}
            />
          );
        });
      })}
      <instancedMesh
        ref={refWeapon}
        args={[weapon.geometry, weapon.material, weapon.arlength]}
        position={weapon.position as T3DP}
        frustumCulled={false}
      />
      <instancedMesh
        ref={refBodyLow}
        args={[
          skinsData[0].body.geometry,
          lowResMaterial,
          skinsData[0].body.arlength,
        ]}
        frustumCulled={false}
        position={skinsData[0].body.position as T3DP}
      />
      <instancedMesh
        ref={refShadow}
        args={[geometryShadow, materialShadow, length]}
        frustumCulled={false}
      />
      <ParticlesManager
        refParticles={refParticles}
        meshPhong={sharedSMat}
        physicSize={PHYSIC_SIZE}
        particleType="box"
      />
      <group position={[0, 1.05, 0]} ref={refText}>
        {arrayText.map((i) => (
          <sprite key={i} visible={false} matrixAutoUpdate={false}>
            <spriteMaterial attach="material" map={null} />
          </sprite>
        ))}
      </group>
    </>
  );
});
