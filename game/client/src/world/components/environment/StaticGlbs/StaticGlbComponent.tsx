import * as THREE from "three";
import { useEffect, useRef } from "react";
import { CICollisionGenerator } from "../../../model/collisionsGenerator";
import { type T3DP } from "../../../../Types/T3DP";

interface StaticGlbComponentProps {
  nodes: { [key: string]: THREE.Mesh | THREE.Group };
  generateCollision: boolean;
}

export function StaticGlbComponent({
  nodes,
  generateCollision = false,
}: StaticGlbComponentProps) {
  const refMesh = useRef<THREE.Group>(null);

  useEffect(() => {
    if (refMesh.current) {
      const meshes = meshPreparator(nodes, generateCollision);
      meshes.forEach((mesh) => toStaticConverter(mesh, refMesh.current!));
    }
  }, [nodes, generateCollision]);

  return <group ref={refMesh} dispose={null} />;
}

function meshPreparator(
  nodes: StaticGlbComponentProps["nodes"],
  generateCollision: boolean,
) {
  const meshArray = Object.values(nodes).filter(
    (node) => node instanceof THREE.Mesh,
  ) as THREE.Mesh[];

  return meshArray.map((mesh) => {
    const { position, rotation, geometry, material } = mesh;
    const currMaterial = material as THREE.MeshStandardMaterial;
    currMaterial.side = THREE.FrontSide;

    // Update material texture filters if present
    [
      currMaterial.map,
      currMaterial.emissiveMap,
      currMaterial.metalnessMap,
      currMaterial.roughnessMap,
    ].forEach((currMatTex) => {
      if (currMatTex) {
        currMatTex.magFilter = THREE.NearestFilter;
        currMatTex.minFilter = THREE.NearestFilter;
      }
    });

    // Clone and transform geometry for collision generation
    const posClone = geometry.attributes.position.clone();
    const normClone = geometry.attributes.normal.clone();
    CICollisionGenerator.transformGeometry(
      posClone,
      normClone,
      position.toArray() as T3DP,
      rotation.toArray() as T3DP,
    );

    if (generateCollision) {
      CICollisionGenerator.generateCollisionFromGeo(
        posClone.array,
        normClone.array,
        geometry.index as THREE.BufferAttribute,
      );
    }

    return mesh;
  });
}

function toStaticConverter(
  mesh: THREE.Mesh<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.Material | THREE.Material[]
  >,
  currGroup: THREE.Object3D,
) {
  mesh.matrixAutoUpdate = false;
  mesh.frustumCulled = true;
  mesh.updateMatrix();
  currGroup.add(mesh);
}

export function toStaticMeshOutConverter(
  mesh: THREE.Mesh<
    THREE.BufferGeometry<THREE.NormalBufferAttributes>,
    THREE.Material | THREE.Material[]
  >,
) {
  mesh.matrixAutoUpdate = false;
  mesh.frustumCulled = true;
  mesh.updateMatrix();
}
