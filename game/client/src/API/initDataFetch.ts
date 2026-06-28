import axios from "axios";
import { workerPool } from "../world/model/WorkerPool";
import { initTheWorld } from "../world/model/VoxelWorld";
import { type T3DP } from "../Types/T3DP";
import { type TPlayer } from "../Types/TPlayer";
import { CIOpponents } from "../players/model/computeOpponentsData";
import { CIMetacubeStates } from "../world/model/MetacubeStates";
import { CILoading } from "../world/model/Loading";
import emitter from "../helpers/EventEmitter";
import { OFF_WORLD_COORD } from "../helpers/worldBoundaries";

/**
 * Fetches the initial game-state binary blob, decodes the header + voxel
 * geometry + player records (via TextDecoder and a DataView-based BinaryReader),
 * and bootstraps the world.
 */

const INIT_URL = import.meta.env.VITE_REACT_APP_INIT_URL;
const CELL_SIZE = 32;
const TIMEOUT = 999900000;

const textDecoder = new TextDecoder("utf-8");

// Reused across all player objects to avoid per-player allocation.
const INITIAL_POS = new Float32Array(9).fill(OFF_WORLD_COORD);

class BinaryReader {
  private offset = 0;

  constructor(private dataView: DataView) {}

  readInt32(): number {
    const value = this.dataView.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readUint16(): number {
    const value = this.dataView.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readUint8(): number {
    const value = this.dataView.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readString(length: number): string {
    const bytes = new Uint8Array(
      this.dataView.buffer,
      this.dataView.byteOffset + this.offset,
      length,
    );
    this.offset += length;
    return textDecoder.decode(bytes);
  }

  getOffset(): number {
    return this.offset;
  }

  hasMore(): boolean {
    return this.offset < this.dataView.byteLength;
  }
}

export async function fetchAndProcessData(): Promise<boolean> {
  try {
    const response = await axios.get(`${INIT_URL}/game/init`, {
      responseType: "arraybuffer",
      timeout: TIMEOUT,
      onDownloadProgress: CILoading.progressFunc,
      headers: {
        Accept: "application/octet-stream",
      },
      decompress: true,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const buffer = response.data;

    if (!(buffer instanceof ArrayBuffer)) {
      throw new Error("Received data is not an ArrayBuffer");
    }

    await processGameData(buffer);
    return true;
  } catch (error) {
    console.error("Failed to fetch or process game data:", error);
    throw error;
  }
}

async function processGameData(buffer: ArrayBuffer): Promise<void> {
  const reader = new BinaryReader(new DataView(buffer));

  const sizeX = reader.readInt32();
  const sizeY = reader.readInt32();
  const sizeZ = reader.readInt32();
  const nbCubeLeft = reader.readInt32();

  const sizes: T3DP = [sizeX, sizeY, sizeZ];
  CIMetacubeStates.setNbCubeLeft(nbCubeLeft);

  const nbVoxels = sizeX * sizeY * sizeZ;

  const currLayer = reader.readUint8();
  CIMetacubeStates.setCurrGameLayer(currLayer);
  emitter.emit("initLayer", currLayer);

  // Zero-copy view into the buffer avoids a geometry copy.
  const offset = reader.getOffset();
  const geometryData = new Uint8Array(buffer, offset, nbVoxels);

  const nbSideCells: T3DP = sizes.map((size) =>
    Math.ceil(size / CELL_SIZE),
  ) as T3DP;

  const playerDataOffset = offset + nbVoxels;
  const playerReader = new BinaryReader(new DataView(buffer, playerDataOffset));
  await processPlayerData(playerReader);

  initTheWorld(sizes, CELL_SIZE, nbSideCells);
  // @ts-expect-error - geometryData is Uint8Array, but worker expects ArrayBufferLike (works in runtime)
  workerPool.initWorker(sizes, geometryData, currLayer);
}

async function processPlayerData(reader: BinaryReader): Promise<void> {
  const allPlayers = CIOpponents.players;
  const currTime = performance.now();

  const players: Array<{ id: number; username: string; skinId: number }> = [];

  while (reader.hasMore()) {
    const id = reader.readUint16();
    const skinId = reader.readUint8();
    const usernameLength = reader.readUint8();

    const username = reader.readString(usernameLength);

    players.push({ id, username, skinId });
  }

  for (const { id, username, skinId } of players) {
    allPlayers[id] = createPlayerObject(username, skinId, currTime);
  }
}

function createPlayerObject(
  username: string,
  skinId: number,
  currTime: number,
): TPlayer {
  return {
    newPos: Array.from(INITIAL_POS),
    oldPos: Array.from(INITIAL_POS),
    posDiff: [],
    newPackageTime: currTime,
    oldPackageTime: currTime - 1,
    recompute: true,
    username,
    textID: null,
    invTimeDiff: 0,
    hammerOffset: 0,
    hammerRot: 0,
    hammerTrans: 0,
    skinId,
  };
}
