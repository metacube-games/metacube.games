import * as THREE from "three";
import { type T3DP } from "../../Types/T3DP";

class CCollisionGenerator {
  private collisionsContainer: Map<string, number> = new Map();
  private vect_of_1 = new THREE.Vector3(1, 1, 1);
  private quat = new THREE.Quaternion();
  private euler = new THREE.Euler();

  private a = new THREE.Vector3();
  private worker = new Worker("workerCollision.js", { type: "module" });
  private transformMatrix = new THREE.Matrix4();
  private normalMatrix = new THREE.Matrix3();

  constructor() {
    this.initWorker();
  }
  initWorker() {
    this.worker.onmessage = (e: MessageEvent<string[]>) => {
      for (const key of e.data) {
        this.collisionsContainer.set(key, -1);
      }
    };
    this.worker.onerror = (err) => {
      console.error("Collision worker error:", err.message);
    };
  }

  public transformGeometry(
    positions: THREE.BufferAttribute,
    normals: THREE.BufferAttribute,
    translation: T3DP,
    rotation: T3DP,
  ) {
    const hasTranslation = translation.some((val) => val !== 0);
    const hasRotation = rotation.some((val) => val !== 0);

    if (hasRotation) {
      this.transformMatrix.compose(
        this.a.set(...translation),
        this.quat.setFromEuler(this.euler.set(...rotation)),
        this.vect_of_1,
      );
      this.normalMatrix.getNormalMatrix(this.transformMatrix);
      // Normals must be transformed by the inverse-transpose (normal matrix).
      normals.applyMatrix3(this.normalMatrix);
    } else if (hasTranslation) {
      this.transformMatrix.makeTranslation(...translation);
      // Translation does not affect normals; skip the normal transform.
    }

    if (hasTranslation || hasRotation) {
      positions.applyMatrix4(this.transformMatrix);
    }
  }

  public generateCollisionFromGeo(
    vertices: THREE.TypedArray,
    normals: THREE.TypedArray,
    indices: THREE.BufferAttribute,
  ) {
    this.updatCollisionFromGeoThreaded(vertices, normals, indices);
  }

  private updatCollisionFromGeoThreaded(
    vertices: THREE.TypedArray,
    normals: THREE.TypedArray,
    indices: THREE.BufferAttribute,
  ) {
    const indicesArr = indices.array;
    const indicesCount = indices.count;

    this.worker.postMessage({
      vertices: vertices,
      normals: normals,
      indices: indicesArr,
      indicesCount: indicesCount,
    });
  }

  public getCollisionsContainer(
    x: number,
    y: number,
    z: number,
  ): number | null {
    return this.collisionsContainer.get([x, y, z].toString()) ?? null;
  }
}

export const CICollisionGenerator = new CCollisionGenerator();
