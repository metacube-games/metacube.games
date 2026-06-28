import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { type GLTF } from "three-stdlib";
import cargo_glb from "../../../assets/glb/scenes/cargo-transformed.glb";
import { AirportModel } from "./StaticGlbs/Airport";
import { useFrame } from "@react-three/fiber";

type GLTFResult = GLTF & {
  nodes: {
    Cube: THREE.Mesh;
  };
  materials: {
    Material: THREE.MeshStandardMaterial;
  };
};

const nbInstance = 24;

export function AirportScene() {
  const tempObjectRef = useRef<THREE.Object3D | null>(null);
  if (tempObjectRef.current === null)
    tempObjectRef.current = new THREE.Object3D();
  const tempObject = tempObjectRef.current;
  const refInstance = useRef<THREE.InstancedMesh>(null!);
  const { nodes, materials } = useGLTF(
    cargo_glb,
    true,
    true,
  ) as unknown as GLTFResult;
  materials.Material.side = THREE.FrontSide;
  // positions of the instances, useMemo
  const positionZ = useMemo(() => {
    const positions = [];
    let seed = 334;
    for (let i = 0; i < nbInstance - 4; i++) {
      seed += 2;
      positions.push(-1000 + THREE.MathUtils.seededRandom(seed) * 2000);
    }
    for (let i = 0; i < 4; i++) {
      seed += 5;
      positions.push(-1000 + THREE.MathUtils.seededRandom(seed) * 2000);
    }
    return positions;
  }, []);

  const lastTime = useRef<number | null>(null);
  if (lastTime.current === null) lastTime.current = performance.now();

  useFrame(() => {
    const time = (performance.now() - lastTime.current!) / 1000;
    lastTime.current = performance.now();
    const dd = 65;
    let i = 0;

    for (let x = -300; x <= -190; x += 22) {
      tempObject.position.setX(x);
      for (let z = 0; z < 4; z++) {
        const id = i++;

        // get the last position
        const pzBase = positionZ[id];

        // Displacement of the ships
        let logMove = time * 100;

        // if the ship is near the peage, it moves slower
        if (pzBase > -dd && pzBase < dd) {
          logMove *= Math.log10(Math.abs((9 * pzBase) / dd) + 1.1);
        }

        // new position
        let pz = pzBase + logMove;

        // if the ship is out of the screen, it reappears on the other side
        if (pz > 1000) {
          pz -= 2000;
        }

        // save the new position
        positionZ[id] = pz;

        // get the position at current index
        tempObject.position.setZ(pz);
        tempObject.updateMatrix();
        refInstance.current.setMatrixAt(id, tempObject.matrix);
      }
    }
    refInstance.current.instanceMatrix.needsUpdate = true;
  }, 2);

  return (
    <group rotation={[0, -Math.PI / 15, 0]} position={[-70, 0, 0]}>
      <instancedMesh
        ref={refInstance}
        args={[nodes.Cube.geometry, materials.Material, nbInstance]}
        frustumCulled={false}
      />
      <AirportModel />
    </group>
  );
}

useGLTF.preload(cargo_glb, true, true);
