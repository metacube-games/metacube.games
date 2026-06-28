import * as THREE from 'three'
import React from 'react'
import { useGLTF } from '@react-three/drei'
import glbPath from './GroundHole.glb'

export function GLBModel(props) {
  const { nodes, } = useGLTF(glbPath)

  const geometry = nodes.Ground.geometry
  const position = geometry.getAttribute('position')
  const idx = nodes.Ground.geometry.index;

  const triMidpoints = [];
  const triNormals = [];
  const collisionPoints = [];

  for (let f = 0; f < idx.count / 3; f++) {
    const idxBase = f * 3;

    const tri = new THREE.Triangle();
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3(),
      normalVect = new THREE.Vector3(),
      e = new THREE.Vector3()

    a.fromBufferAttribute(position, idx.getX(idxBase + 0));
    b.fromBufferAttribute(position, idx.getX(idxBase + 1));
    c.fromBufferAttribute(position, idx.getX(idxBase + 2));
    tri.set(a, b, c);
    tri.getNormal(normalVect);
    tri.getMidpoint(e);
    triNormals[f] = normalVect;
    triMidpoints[f] = e;

    const vect_of_1 = new THREE.Vector3(1, 1, 1);
    const compVect = new THREE.Vector3(0, 1, 2);
    const normComponent = Math.abs(Math.round(compVect.dot(normalVect)));
    const planeComponent1 = (normComponent + 1) % 3;
    const planeComponent2 = (normComponent + 2) % 3;
    const boundingSquareMin = new THREE.Vector2(0, 0);
    const boundingSquareMax = new THREE.Vector2(0, 0);

    // Math.round() accounts for floating-point drift from Blender export
    boundingSquareMin.setX(Math.round(Math.min(a.getComponent(planeComponent1), b.getComponent(planeComponent1))));
    boundingSquareMin.setY(Math.round(Math.min(a.getComponent(planeComponent2), b.getComponent(planeComponent2))));
    boundingSquareMax.setX(Math.round(Math.max(a.getComponent(planeComponent1), b.getComponent(planeComponent1))));
    boundingSquareMax.setY(Math.round(Math.max(a.getComponent(planeComponent2), b.getComponent(planeComponent2))));

    for (let x = boundingSquareMin.x; x < boundingSquareMax.x; x++) {
      for (let y = boundingSquareMin.y; y < boundingSquareMax.y; y++) {
        const normAxisVal = vect_of_1.dot(normalVect) < 0 ? a.getComponent(normComponent) : a.getComponent(normComponent) - 1;
        const collPoint = new THREE.Vector3();
        // Math.round() necessary
        collPoint.setComponent(normComponent, Math.round(normAxisVal));
        collPoint.setComponent(planeComponent1, x);
        collPoint.setComponent(planeComponent2, y);

        collisionPoints.push(collPoint);
      }
    }
  }

  function saveJson() {
    const collContainer = [];
    collisionPoints.forEach(element => {
      collContainer.push([element.x, element.y, element.z]);
    })
    const arrJson = Array.from(new Set(collContainer.map(JSON.stringify)), JSON.parse)
    const jsonData = JSON.stringify(arrJson);
    download(jsonData, 'collisionPositions.json', 'text/json');
  }

  if (props.dlJson) {
    saveJson();
  }

  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Ground.geometry} material={nodes.Ground.materials}>
        {
          // displays normal vectors of every triangle of the geometry
          triMidpoints.map((position, i) => {
            return (
              <arrowHelper key={i} args={[triNormals[i], triMidpoints[i], 10, 0x0000ff]} />
            )
          })
        }
      </mesh>
    </group>
  )
}

useGLTF.preload(glbPath)

function download(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}
