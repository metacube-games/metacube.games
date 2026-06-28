import { getWorld } from "./VoxelWorld";
import { startTransition } from "react";
import { CIDestroyedAnim } from "../components/animFromVoxel/IntersectedCube";
import { CISettingsMng } from "../../menu/subMenus/NavigationBar/Model/CSettingsManager";
import * as THREE from "three";
import { type T3DP } from "../../Types/T3DP";
import { CIMetacubeStates } from "./MetacubeStates";
import { SAG } from "../../menu/useGeneralStore";
import { getIsDesktop } from "../../helpers/getIsDesktop";

const Int8Arr = new Int8Array(0);
const Float32Arr = new Float32Array(0);
const Uint32Arr = new Uint32Array(0);
const posAttrib = new THREE.BufferAttribute(Int8Arr, 3);
const normAttrib = new THREE.BufferAttribute(Int8Arr, 3);
const uvAttrib = new THREE.BufferAttribute(Float32Arr, 2);
const colorAttrib = new THREE.BufferAttribute(Float32Arr, 3);
const indexAttrib = new THREE.BufferAttribute(Uint32Arr, 1);
const posVec = new THREE.Vector3();
const targetPos = new THREE.Vector3();
const primRendDist = new THREE.Sphere();
const secRendDist = new THREE.Sphere();

type TWorker = {
  worker: Worker;
  inUse: boolean;
  voxelsToDestroy: T3DP[];
  destroyedVoxels: T3DP[];
  taskCount: number;
  lastUsedTime: number;
  inFlightCellId: number | null;
};

/**
 * WorkerPool manages 1-2 web workers for chunk meshing and lighting.
 *
 * Pending cell and light updates are held in Set-backed queues so duplicate
 * updates are deduped while insertion order is preserved. Messages to workers
 * use transferable typed arrays to avoid copying payloads.
 */
class WorkerPool {
  private workers: TWorker[] = [];
  private toUpdateCells: Set<number> = new Set();
  private toUpdateCellsQueue: number[] = [];
  private toUpdateLight: Set<number> = new Set();
  private toUpdateLightQueue: number[] = [];
  private waitingList: Set<number> = new Set();
  public updatedCellsID: Set<number> = new Set();
  private updatedLightID: Set<number> = new Set();
  private avoidLightUpdate: Set<number> = new Set();
  private pendingTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();
  private renderDistanceListener: { remove: () => void } | null = null;

  private primaryDist: number = 48;
  private secondaryDist: number = 500000;
  private initSynchroToDestroy: T3DP[] = [];

  private lastCameraPosition = new THREE.Vector3();
  private cameraMovementThreshold = 1;

  constructor() {
    this.init();
  }

  private deduplicateCellQueue(): void {
    if (this.toUpdateCellsQueue.length <= 1) return;

    const seen = new Set<number>();
    const deduplicated: number[] = [];

    for (let i = this.toUpdateCellsQueue.length - 1; i >= 0; i--) {
      const cellId = this.toUpdateCellsQueue[i];
      if (!seen.has(cellId)) {
        seen.add(cellId);
        deduplicated.unshift(cellId);
      }
    }

    if (deduplicated.length < this.toUpdateCellsQueue.length) {
      this.toUpdateCellsQueue = deduplicated;
      this.toUpdateCells.clear();
      deduplicated.forEach((id) => this.toUpdateCells.add(id));
    }
  }

  init() {
    this.secondaryDistInit();
    const isDesktop = getIsDesktop();
    const nbWorkers = isDesktop ? 2 : 1;
    for (let i = 0; i < nbWorkers; i++) {
      this.workers.push({
        worker: new Worker(`worker.js?v=${__WORKER_BUILD__}`, { type: "module" }),
        inUse: true,
        voxelsToDestroy: [],
        destroyedVoxels: [],
        taskCount: 0,
        lastUsedTime: 0,
        inFlightCellId: null,
      });
    }
  }

  initWorker(sizes: T3DP, data: ArrayBufferLike, currLayer: number) {
    this.workersListener();
    this.postInitWorldGeometry(sizes, data, currLayer);
  }

  addInitSynchroToDestroy(voxel: T3DP) {
    this.initSynchroToDestroy.push(voxel);
  }

  setInitSynchroToDestroy() {
    this.initSynchroToDestroy.forEach((voxel) => {
      this.setDestructionEvent(voxel);
    });
    this.initSynchroToDestroy = [];
  }

  setDestructionEvent(pos: T3DP) {
    this.onVoxelDestruction(pos);
  }

  secondaryDistInit() {
    let currRenderDist = CISettingsMng.render.renderDistance.getVal();
    currRenderDist =
      currRenderDist >= CISettingsMng.render.renderDistance.max
        ? 1000
        : currRenderDist;
    const cellSize3 = 100;
    this.secondaryDist = cellSize3 + currRenderDist;

    const onDistanceListener = (distance: number) => {
      distance =
        distance >= CISettingsMng.render.renderDistance.max ? 1000 : distance;
      this.secondaryDist = cellSize3 + distance;
    };

    this.renderDistanceListener =
      CISettingsMng.render.renderDistance.addListener(onDistanceListener);
  }

  postInitToWorker(sizes: T3DP, data: ArrayBufferLike, currLayer: number) {
    const world = getWorld();
    for (let i = 1; i < this.workers.length; i++) {
      this.workers[i].worker.postMessage({
        event: "initWorker",
        sizes: sizes,
        geometry: data,
        cellSize: world.cellSize,
        currLayer: currLayer,
      });
    }
  }

  postInitWorldGeometry(sizes: T3DP, data: ArrayBufferLike, currLayer: number) {
    const world = getWorld();
    this.workers[0].worker.postMessage({
      event: "initWorldGeometry",
      sizes: sizes,
      geometry: data,
      cellSize: world.cellSize,
      currLayer: currLayer,
    });
    this.postInitToWorker(sizes, data, currLayer);
  }

  addUpdateToQueue(cellId: number, x: number, y: number, z: number) {
    targetPos.set(x, y, z);

    if (primRendDist.containsPoint(targetPos)) {
      if (!this.toUpdateCells.has(cellId)) {
        this.toUpdateCells.add(cellId);
        this.toUpdateCellsQueue.unshift(cellId);
      }
      this.waitingList.delete(cellId);
      return;
    }

    if (secRendDist.containsPoint(targetPos)) {
      if (!this.toUpdateCells.has(cellId)) {
        this.toUpdateCells.add(cellId);
        this.toUpdateCellsQueue.push(cellId);
      }
      this.waitingList.delete(cellId);
      return;
    }

    if (!this.toUpdateCells.has(cellId) && !this.waitingList.has(cellId)) {
      this.waitingList.add(cellId);
    }
  }

  sendWaitingListToWorkers(camera: THREE.Camera) {
    const cameraPos = camera.position;
    const cameraMoved = this.lastCameraPosition.distanceToSquared(cameraPos);
    const shouldUpdate =
      cameraMoved > this.cameraMovementThreshold * this.cameraMovementThreshold;

    if (shouldUpdate) {
      this.lastCameraPosition.copy(cameraPos);
    }

    posVec.set(cameraPos.x, cameraPos.y, cameraPos.z);
    primRendDist.set(posVec, this.primaryDist);
    secRendDist.set(posVec, this.secondaryDist);
    const world = getWorld();
    this.sendLightUpdateToWorkers();
    this.sendUpdateToWorkers();

    if (!shouldUpdate && this.waitingList.size === 0) return;

    const cellsToPromote: number[] = [];
    for (const cellId of this.waitingList) {
      targetPos.set(...world.cellsCenter[cellId]);
      if (secRendDist.containsPoint(targetPos)) {
        cellsToPromote.push(cellId);
      }
    }

    if (cellsToPromote.length > 0) {
      for (const cellId of cellsToPromote) {
        this.waitingList.delete(cellId);
        if (!this.toUpdateCells.has(cellId)) {
          this.toUpdateCells.add(cellId);
          this.toUpdateCellsQueue.push(cellId);
        }
      }
      this.sendUpdateToWorkers();
    }
  }

  visibleCellsUpdate(idToMeshMap: Record<number, THREE.Mesh>) {
    const world = getWorld();
    const currSettings = CISettingsMng.render.renderDistance;
    if (currSettings.getVal() >= currSettings.max) {
      return;
    }

    const worldData = world.getRenderingData();
    const cellsToHide: number[] = [];

    const centerLength = world.cellsCenter.length;
    for (let i = 0; i < centerLength; i++) {
      const mesh = idToMeshMap[i];
      if (!mesh) continue;

      const center = world.cellsCenter[i];
      targetPos.set(center[0], center[1], center[2]);

      if (secRendDist.containsPoint(targetPos)) {
        mesh.visible = true;
      } else {
        if (mesh.geometry.attributes.position.array.length > 0) {
          cellsToHide.push(i);
        }
      }
    }

    if (cellsToHide.length > 0) {
      for (const i of cellsToHide) {
        const mesh = idToMeshMap[i];
        if (!mesh) continue;

        worldData[i] = {
          positions: Int8Arr,
          normals: Int8Arr,
          uvs: Float32Arr,
          indices: Uint32Arr,
          colors: Float32Arr,
        };

        const geometry = mesh.geometry;
        geometry.setAttribute("position", posAttrib);
        geometry.setAttribute("normal", normAttrib);
        geometry.setAttribute("uv", uvAttrib);
        geometry.setAttribute("color", colorAttrib);
        geometry.setIndex(indexAttrib);

        const attributes = geometry.attributes;
        if (attributes.position) attributes.position.needsUpdate = true;
        if (attributes.normal) attributes.normal.needsUpdate = true;
        if (attributes.uv) attributes.uv.needsUpdate = true;
        if (attributes.color) attributes.color.needsUpdate = true;
        if (geometry.index) geometry.index.needsUpdate = true;

        if (!this.toUpdateCells.has(i) && !this.waitingList.has(i)) {
          this.waitingList.add(i);
        }
      }
    }
  }

  sendUpdateToWorkers() {
    if (this.toUpdateCellsQueue.length === 0) return;

    this.deduplicateCellQueue();

    while (this.toUpdateCellsQueue.length > 0) {
      const worker = this.selectBestWorker();
      if (!worker) break;

      this.postUpdateCell(worker);
    }
  }

  private selectBestWorker(): TWorker | null {
    let bestWorker: TWorker | null = null;
    let lowestTaskCount = Infinity;

    for (const worker of this.workers) {
      if (!worker.inUse) {
        if (worker.taskCount < lowestTaskCount) {
          lowestTaskCount = worker.taskCount;
          bestWorker = worker;
        }
      }
    }

    return bestWorker;
  }

  postUpdateCell(worker: TWorker) {
    const cellId = this.toUpdateCellsQueue.shift();
    if (cellId === undefined) return;

    this.toUpdateCells.delete(cellId);
    worker.inUse = true;
    worker.inFlightCellId = cellId;
    worker.lastUsedTime = performance.now();
    worker.taskCount++;

    const voxelsCount = worker.voxelsToDestroy.length;
    const flattenedVoxels = new Uint8Array(voxelsCount * 3);
    for (let i = 0; i < voxelsCount; i++) {
      const voxel = worker.voxelsToDestroy[i];
      const idx = i * 3;
      flattenedVoxels[idx] = voxel[0];
      flattenedVoxels[idx + 1] = voxel[1];
      flattenedVoxels[idx + 2] = voxel[2];
    }

    worker.worker.postMessage(
      {
        event: "updateCell",
        cellID: cellId,
        voxelsToDestroy: flattenedVoxels.buffer,
      },
      [flattenedVoxels.buffer],
    );

    if (worker.voxelsToDestroy.length > 0) {
      worker.destroyedVoxels.push(...worker.voxelsToDestroy);
      worker.voxelsToDestroy.length = 0;
    }
  }

  sendLightUpdateToWorkers() {
    const worker = this.workers[this.workers.length - 1];
    if (worker && !worker.inUse && this.toUpdateLightQueue.length > 0) {
      this.postUpdateLight(worker);
    }
  }

  postUpdateLight(worker: TWorker) {
    const cellId = this.toUpdateLightQueue.shift();
    if (cellId === undefined) return;

    this.toUpdateLight.delete(cellId);
    worker.inUse = true;
    worker.inFlightCellId = cellId;
    worker.lastUsedTime = performance.now();
    worker.taskCount++;

    const flattenedVoxels = new Uint8Array(worker.voxelsToDestroy.length * 3);
    for (let i = 0; i < worker.voxelsToDestroy.length; i++) {
      const voxel = worker.voxelsToDestroy[i];
      flattenedVoxels[i * 3] = voxel[0];
      flattenedVoxels[i * 3 + 1] = voxel[1];
      flattenedVoxels[i * 3 + 2] = voxel[2];
    }

    const lightCellsArray = new Int16Array(this.toUpdateLight.size);
    let idx = 0;
    for (const cell of this.toUpdateLight) {
      lightCellsArray[idx++] = cell;
    }

    worker.worker.postMessage(
      {
        event: "updateLight",
        cellID: cellId,
        voxelsToDestroy: flattenedVoxels.buffer,
        lightCellToUpdate: lightCellsArray.buffer,
      },
      [flattenedVoxels.buffer, lightCellsArray.buffer],
    );

    // Carry voxels that are still alive into the next mesh update; decrementing
    // the cube-left counter here would double-count them.
    const temp: T3DP[] = [];
    const world = getWorld();
    worker.voxelsToDestroy.forEach((voxel) => {
      const exist = world.getVoxel(...voxel);
      if (exist !== null && exist > 0) {
        temp.push(voxel);
      }
    });

    worker.voxelsToDestroy = temp;
  }

  generateGeometryDataThreaded() {
    const world = getWorld();
    const cells = world.cells;
    for (const cId in cells) {
      const cellId = parseInt(cId);
      const currCellCenter = world.cellsCenter[cellId];
      this.addUpdateToQueue(cellId, ...currCellCenter);
    }
    this.sendUpdateToWorkers();
  }

  /**
   * when a voxel is destroyed, we need to update the cell and the ones around it
   * @param {array} voxelPos
   */
  onVoxelDestruction(voxelPos: T3DP) {
    const world = getWorld();

    this.workers.forEach((worker) => {
      worker.voxelsToDestroy.push(voxelPos);
    });
    const cellId = world.computeCellId(...voxelPos);
    if (cellId === null) {
      console.warn("cellId is null", voxelPos);
      return;
    }
    const updatedCells = world.updateVoxelGeometry(cellId, ...voxelPos);

    for (const updatedCellId of updatedCells) {
      this.avoidLightUpdate.add(updatedCellId);
      const currCellCenter = world.cellsCenter[updatedCellId];
      this.addUpdateToQueue(updatedCellId, ...currCellCenter);
    }

    this.sendUpdateToWorkers();
  }

  workersListener() {
    this.workers.forEach((worker) => {
      worker.worker.onmessage = (msg) => {
        worker.inUse = false;
        worker.inFlightCellId = null;

        const type = msg.data.event;
        if (type === "updated") {
          const {
            positions,
            normals,
            uvs,
            indices,
            cellID,
            colors,
            lightPositions,
            lightRGB,
            lightPositionsCell,
          } = msg.data;

          this.addToUpdateLightList(lightPositionsCell, cellID);
          this.setWorldLights(lightPositions, lightRGB);

          const data = {
            positions: new Int8Array(positions),
            normals: new Int8Array(normals),
            uvs: new Float32Array(uvs),
            indices: new Uint32Array(indices),
            colors: new Float32Array(colors),
          };

          const world = getWorld();
          world.setRenderingData(data, cellID);
          this.updatedCellsID.add(cellID);

          for (let j = 0; j < worker.destroyedVoxels.length; j++) {
            const vPos = worker.destroyedVoxels[j];
            const exist = world.getVoxel(...vPos);
            if (exist !== null && exist > 0) {
              CIMetacubeStates.updateNbCubeLeft();
              targetPos.set(...vPos);
              if (primRendDist.containsPoint(targetPos)) {
                CIDestroyedAnim.initDestructAnim(vPos);
              }
              world.setVoxel(...vPos, 0);
            }
          }

          worker.destroyedVoxels = [];

          this.sendLightUpdateToWorkers();
          if (this.toUpdateCellsQueue.length > 0) {
            this.postUpdateCell(worker);
          }
        } else if (type === "updateLight") {
          const {
            cellID,
            colors,
            lightPositions,
            lightRGB,
            lightPositionsCell,
          } = msg.data;

          this.addToUpdateLightList(lightPositionsCell, cellID);
          this.setWorldLights(lightPositions, lightRGB);
          const world = getWorld();
          world.setLightData(new Float32Array(colors), cellID);
          this.updatedLightID.add(cellID);
        } else if (type === "initWorkers") {
          const { fullArray, cells, lights, syncVoxels } = msg.data;
          const fullArrayT = new Int8Array(fullArray);
          const lightsT = new Int8Array(lights);
          const cellsT = new Int8Array(cells);
          const syncVoxelsT = new Uint8Array(syncVoxels);

          const world = getWorld();
          world.setAllCells(fullArrayT, lightsT, syncVoxelsT);
          world.computeCellsCenter(cellsT);
          this.generateGeometryDataThreaded();

          startTransition(() => {
            this.setInitSynchroToDestroy();
            SAG.setReadyToRender(true);
          });
        }
      };

      // inUse must be cleared on error; otherwise all future meshing stalls silently.
      worker.worker.onerror = (err) => {
        console.error(`Mesh worker error (cell ${worker.inFlightCellId} dropped) — recovering:`, err.message);
        worker.inFlightCellId = null;
        worker.inUse = false;
        this.sendLightUpdateToWorkers();
        this.sendUpdateToWorkers();
      };
      worker.worker.onmessageerror = (err) => {
        console.error(`Mesh worker message-decode error (cell ${worker.inFlightCellId} dropped) — recovering:`, err);
        worker.inFlightCellId = null;
        worker.inUse = false;
        this.sendUpdateToWorkers();
      };
    });
  }

  private setWorldLights(lightPositions: ArrayBuffer, lightRGB: ArrayBuffer) {
    const world = getWorld();
    const lightPTyped = new Int32Array(lightPositions);
    const lightRGBTyped = new Int8Array(lightRGB);

    for (let i = 0; i < lightPTyped.length; i++) {
      const i4 = i * 4;
      world.setLightAtVoxelOffset(
        lightPTyped[i],
        lightRGBTyped[i4],
        lightRGBTyped[i4 + 1],
        lightRGBTyped[i4 + 2],
        lightRGBTyped[i4 + 3],
      );
    }
  }

  private addToUpdateLightList(
    lightPositionsCell: ArrayBuffer,
    cellID: number,
  ) {
    const lightPositionsCellT = new Int16Array(lightPositionsCell);

    // Remove cellID from this.avoidLightUpdate
    this.avoidLightUpdate.delete(cellID);

    if (lightPositionsCellT.length > 0) {
      for (let i = 0; i < lightPositionsCellT.length; i++) {
        const lightCellId = lightPositionsCellT[i];
        if (lightCellId === cellID) continue;

        if (this.avoidLightUpdate.has(lightCellId)) {
          this.avoidLightUpdate.delete(lightCellId);
        } else if (!this.toUpdateLight.has(lightCellId)) {
          this.toUpdateLight.add(lightCellId);
          this.toUpdateLightQueue.push(lightCellId);
        }
      }
    }
  }

  getUpdatedLightIDs() {
    return this.updatedLightID;
  }

  removeUpdatedLightID(cellID: number) {
    this.updatedLightID.delete(cellID);
  }

  getUpdatedCellsIDs() {
    return this.updatedCellsID;
  }

  removeUpdatedCellID(cellID: number) {
    this.updatedCellsID.delete(cellID);
  }

  async postLayerChange(layer: number) {
    await this.waitForWorkersIdle();

    this.workers.forEach((worker) => {
      worker.inUse = true;
      worker.worker.postMessage({
        event: "changeLayer",
        layer: layer,
      });
    });

    this.generateGeometryDataThreaded();
  }

  private async waitForWorkersIdle(): Promise<void> {
    return new Promise((resolve) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const checkIdle = () => {
        const allIdle = this.workers.every((worker) => !worker.inUse);
        if (allIdle) {
          resolve();
        } else {
          timeoutId = setTimeout(checkIdle, 50);
          this.pendingTimeouts.add(timeoutId);
        }
      };

      checkIdle();

      const cleanup = () => {
        if (timeoutId !== null) {
          this.pendingTimeouts.delete(timeoutId);
        }
      };

      const originalResolve = resolve;
      resolve = (...args) => {
        cleanup();
        originalResolve(...args);
      };
    });
  }

  clearQueues() {
    this.toUpdateCells.clear();
    this.toUpdateCellsQueue.length = 0;
    this.toUpdateLight.clear();
    this.toUpdateLightQueue.length = 0;
    this.waitingList.clear();
    this.updatedCellsID.clear();
    this.updatedLightID.clear();
    this.avoidLightUpdate.clear();
  }

  clearPendingTimeouts() {
    this.pendingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.pendingTimeouts.clear();
  }

  destroy() {
    this.clearPendingTimeouts();

    if (this.renderDistanceListener) {
      this.renderDistanceListener.remove();
      this.renderDistanceListener = null;
    }

    this.clearQueues();

    this.workers.forEach((worker) => {
      worker.worker.terminate();
    });
    this.workers = [];
  }

  getStats() {
    const now = performance.now();
    return {
      workersCount: this.workers.length,
      busyWorkers: this.workers.filter((w) => w.inUse).length,
      pendingCellUpdates: this.toUpdateCellsQueue.length,
      pendingLightUpdates: this.toUpdateLightQueue.length,
      waitingCells: this.waitingList.size,
      updatedCells: this.updatedCellsID.size,
      updatedLights: this.updatedLightID.size,
      workers: this.workers.map((w, i) => ({
        id: i,
        inUse: w.inUse,
        taskCount: w.taskCount,
        idleTime: w.inUse ? 0 : now - w.lastUsedTime,
        voxelsToDestroy: w.voxelsToDestroy.length,
        destroyedVoxels: w.destroyedVoxels.length,
      })),
    };
  }

  resetStats() {
    this.workers.forEach((worker) => {
      worker.taskCount = 0;
      worker.lastUsedTime = performance.now();
    });
  }
}

export const workerPool = new WorkerPool();
