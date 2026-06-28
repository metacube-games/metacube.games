import * as THREE from "three";
import { getWorld } from "../world/model/VoxelWorld";
import { CIPlayer, CIPlayerPhys } from "../players/model/playerPhysic";
import { workerPool } from "../world/model/WorkerPool";
import { type T3DP } from "../Types/T3DP";
import { type TPlayer } from "../Types/TPlayer";
import { CIOpponents } from "../players/model/computeOpponentsData";
import { CIDestroyedAnim } from "../world/components/animFromVoxel/IntersectedCube";
import { HEAD_ROT_Y_LUT, HEAD_ROT_X_LUT } from "../helpers/headRotationLut";
import { getPublicKey } from "../API/starknet";
import { getDisconnect, postLayerAchievement } from "../API/backendAPI";
import { CIHUD } from "../menu/HUD/hudInfo";
import {
  arrReadUint16,
  arrReadUint8,
  arrReadString,
  arrWriteUint16,
  arrReadUint32,
  arrWriteInt16,
  arrReadInt16,
} from "../helpers/decodeHelper";
import emitter from "../helpers/EventEmitter";
import { type CAlert, CIAlertMng } from "../menu/subMenus/AlertDialog";
import { CICollisionFinder } from "../players/model/findIntersection";
import { CIOpponentsParticles } from "../players/components/Opponents";
import { CIMainViewer } from "../players/model/viewerMode";
import { CIBombManager } from "../world/managers/bombManager";
import {
  LIN_POS_OFFSET_X,
  LIN_POS_OFFSET_Y,
  LIN_POS_OFFSET_Z,
  LIN_POS_RATIO,
  LIN_POS_RATIO_INV,
  OFF_WORLD_COORD,
} from "../helpers/worldBoundaries";
import { PID4, PID2, PID3, PID8, PI } from "../helpers/PI";
import {
  setNewConnectedPlayers,
  setSelfPlayer,
} from "../world/components/environment/OpponentsSpawn";
import { CISoundMng } from "../sound/soundFX";
import { SAnotifyAction } from "../menu/subMenus/NavigationBar/Model/achievement/store";
import { SAG, SGG } from "../menu/useGeneralStore";
import { CIMetacubeStates } from "../world/model/MetacubeStates";
import { LAYER_BOUNDS, spawnZForLayer } from "../world/model/layerBounds";
import { setDeep } from "../menu/subMenus/NavigationBar/Model/notifTips/store";
import { CIUpgradeMng } from "../menu/subMenus/NavigationBar/Model/CUpgradeManager";
import { setSelectedSkinStateGL } from "../menu/subMenus/NavigationBar/CharacterPanel";

const WEBSOCKET_VIEW_URL = import.meta.env.VITE_REACT_APP_WEBSOCKET_VIEW_URL;
const WEBSOCKET_GAME_URL = import.meta.env.VITE_REACT_APP_WEBSOCKET_GAME_URL;

const dummyVec1 = new THREE.Vector3();
const dummyVec2 = new THREE.Vector3();
const dummyVec3 = new THREE.Vector3();
export const UINT2_MAX = 3;
export const UINT3_MAX = 7;

export const legIntensity = [0, 0.7, 1.1, 1.57];
export const orOffsets = [0, PID4, -PID4, PID2, -PID2];

/**
 * Binary wire protocol — client ↔ game server.
 *
 * Every message starts with a 1-byte opcode (see CSocketMng.send/receive).
 * The remainder is message-specific payload. Below: shared layouts.
 *
 * Per-player record (used by `players_positions` broadcast):
 *  total = 11 bytes, repeated for each connected player
 *    [0..1]  uint16 id
 *    [2..3]  uint16 posX (apply LIN_POS_RATIO_INV/OFFSET to get world coords)
 *    [4..5]  uint16 posY
 *    [6..7]  uint16 posZ
 *    [8]     uint8  rotX (mapped via HEAD_ROT_X_LUT lookup)
 *    [9]     uint8  rotY (mapped via HEAD_ROT_Y_LUT lookup)
 *    [10]    uint8  dataContainer (packed flags, see playerPhysic.move())
 */
const PROTOCOL = {
  PLAYER_RECORDS_START: 1,
  PLAYER_RECORD_BYTES: 11,
  /** Offsets relative to message start when paired with offsetID = i * PLAYER_RECORD_BYTES. */
  PLAYER_OFFSET: {
    id: 1,
    posX: 3,
    posY: 5,
    posZ: 7,
    rotX: 9,
    rotY: 10,
    dataContainer: 11,
  },
} as const;

const NORMAL_HIT = 0;
const CRITICAL_HIT = 1;

/** Reads a world-coord position (x,y,z) from 3 consecutive uint16s, applying the linear-pos ratio/offset. */
function readWorldPos(msg: Uint8Array, offset: number): T3DP {
  return [
    arrReadUint16(msg, offset) * LIN_POS_RATIO_INV - LIN_POS_OFFSET_X,
    arrReadUint16(msg, offset + 2) * LIN_POS_RATIO_INV - LIN_POS_OFFSET_Y,
    arrReadUint16(msg, offset + 4) * LIN_POS_RATIO_INV - LIN_POS_OFFSET_Z,
  ];
}

/** Reads a raw voxel/grid position (x,y,z) from 3 consecutive uint16s. */
function readVoxelPos(msg: Uint8Array, offset: number): T3DP {
  return [
    arrReadUint16(msg, offset),
    arrReadUint16(msg, offset + 2),
    arrReadUint16(msg, offset + 4),
  ];
}

class CSocketMng {
  private send = {
    move: 0,
    hitCube: 1,
    getHp: 2,
    connect: 3,
    hpLoss: 4,
    upgrade: 5,
    hitPlayer: 6,
    placeBomb: 7,
    leaveQueue: 0x0a,
  };
  private receive = {
    players_positions: 0x00,
    voxel_hp: 0x01,
    voxel_hp_hit: 0x02,
    voxel_hp_critical_hit: 0x03,
    voxel_destroyed: 0x04,
    authentication: 0x05,
    player_disconnected: 0x06,
    player_connected: 0x07,
    dead_player: 0x08,
    change_layer: 0x09,
    next_player: 0x0a,
    leave_queue: 0x0b,
    player_hit: 0x0f,
    player_updated_skin: 0x10,
    bomb_placed: 0x11,
    bomb_exploded: 0x12,
    start_maintenance: 0x14,
    achievement_notification: 0x28,
  };
  // Lazily created by connect() so Strict Mode double-mounts don't open extra sockets.
  // `!` is safe because all use is gated behind connect() (called from App.tsx's mount effect).
  public socketViewer!: WebSocket;
  public socketPlayer: WebSocket | null = null;
  public currSocket!: WebSocket;
  private connected = false;
  public lastGetHpCall = performance.now();
  public id: string = "";

  private buffers = {
    pos: new ArrayBuffer(10),
    hitCube: new ArrayBuffer(7),
    hpCube: new ArrayBuffer(7),
    hpLoss: new ArrayBuffer(2),
    upgrade: new ArrayBuffer(1),
    leaveQueue: new ArrayBuffer(3),
    hitPlayer: new ArrayBuffer(9),
    placeBomb: new ArrayBuffer(8),
  };
  views = {
    pos: new Uint8Array(this.buffers.pos),
    hitCube: new Uint8Array(this.buffers.hitCube),
    hpCube: new Uint8Array(this.buffers.hpCube),
    hpLoss: new Uint8Array(this.buffers.hpLoss),
    upgrade: new Uint8Array(this.buffers.upgrade),
    leaveQueue: new Uint8Array(this.buffers.leaveQueue),
    hitPlayer: new Uint8Array(this.buffers.hitPlayer),
    placeBomb: new Uint8Array(this.buffers.placeBomb),
  };

  connect() {
    if (this.connected) return;
    this.connected = true;
    this.socketViewer = new WebSocket(WEBSOCKET_VIEW_URL);
    this.socketViewer.binaryType = "arraybuffer";
    this.currSocket = this.socketViewer;
    this.initSocket(this.currSocket, undefined, "viewer");
  }

  // Silence onclose before closing so deliberate teardown doesn't trigger auto-reconnect.
  disconnect() {
    if (!this.connected) return;
    this.connected = false;
    if (this.socketViewer) {
      this.socketViewer.onclose = () => {};
      this.socketViewer.close();
    }
    if (this.socketPlayer) {
      this.socketPlayer.onclose = () => {};
      this.socketPlayer.close();
      this.socketPlayer = null;
    }
  }

  resetId() {
    this.id = "";
  }

  setSocket(socket: WebSocket) {
    this.currSocket = socket;
  }

  switchSocket(url: string, msg: ArrayBuffer, socketType: string) {
    if (socketType === "viewer") {
      if (
        this.socketViewer &&
        this.socketViewer.readyState !== WebSocket.CLOSED
      )
        return;
      this.socketViewer = new WebSocket(url);
      this.socketViewer.binaryType = "arraybuffer";

      this.setSocket(this.socketViewer);
      this.initSocket(this.socketViewer, msg, socketType);
    } else if (socketType === "player") {
      if (
        this.socketPlayer &&
        this.socketPlayer.readyState !== WebSocket.CLOSED
      )
        return;
      this.socketPlayer = new WebSocket(url);
      this.socketPlayer.binaryType = "arraybuffer";
      this.setSocket(this.socketPlayer);
      this.initSocket(this.socketPlayer, msg, socketType);
    }
  }

  enterGame(serverId: number) {
    this.switchSocket(
      `${WEBSOCKET_GAME_URL}/${serverId}`,
      this.sendSocketGetConnect(),
      "player",
    );
  }

  enteringGame() {
    SAG.setIsInGameQueue(false, undefined);
    SAG.setMenuDisplay(false);
    CIAlertMng.dialogs.connecting.emit();
  }

  quitGame(alertMsg: CAlert) {
    // 0: Nothing 1: AFK  2: Death  3: KICKED  6: connection lost:
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
    SAG.setMenuDisplay(true);
    SAG.setIsInGame(false);
    CIOpponents.addToBeFree(this.id);

    // Clean up local player's bombs
    CIBombManager.removePlayerBombs(this.id.toString());

    this.resetId();

    this.switchSocket(
      WEBSOCKET_VIEW_URL,
      this.sendSocketGetConnect(),
      "viewer",
    );
    CISoundMng?.stopAllInGameFXSounds();
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
    alertMsg.emit();
    CIMainViewer.setRotatingCamera();
  }

  sendSocket(message: ArrayBuffer) {
    if (this.currSocket.readyState !== WebSocket.OPEN) return;
    this.currSocket.send(message);
  }

  sendSocketPos(position: T3DP, pose: T3DP) {
    this.views.pos[0] = this.send.move;
    arrWriteUint16(this.views.pos, position[0], 1);
    arrWriteUint16(this.views.pos, position[1], 3);
    arrWriteUint16(this.views.pos, position[2], 5);
    this.views.pos[7] = pose[0];
    this.views.pos[8] = pose[1];
    this.views.pos[9] = pose[2];

    this.sendSocket(this.buffers.pos);
  }

  calledGetHPTooSoon() {
    if (performance.now() - this.lastGetHpCall < 100) {
      return true;
    }
    return false;
  }

  checkOutsideInsideLayer(position: T3DP) {
    const currLayer = LAYER_BOUNDS[CIMetacubeStates.currentLayer];
    if (!currLayer) return false;
    if (
      position[0] < currLayer[0] ||
      position[0] >= currLayer[1] ||
      position[1] < currLayer[2] ||
      position[1] >= currLayer[3] ||
      position[2] < currLayer[4] ||
      position[2] >= currLayer[5]
    ) {
      return false;
    }
    return true;
  }

  sendSocketHitCube(position: T3DP) {
    if (this.checkOutsideInsideLayer(position)) return;
    this.views.hitCube[0] = this.send.hitCube;
    this.cubePos(this.views.hitCube, position);
    this.sendSocket(this.buffers.hitCube);
  }

  sendSocketGetHp(position: T3DP) {
    if (this.calledGetHPTooSoon() || this.checkOutsideInsideLayer(position))
      return;
    this.views.hpCube[0] = this.send.getHp;
    this.cubePos(this.views.hpCube, position);
    this.sendSocket(this.buffers.hpCube);
    this.lastGetHpCall = performance.now();
  }

  private cubePos(view: Uint8Array, position: T3DP) {
    arrWriteUint16(view, position[0], 1);
    arrWriteUint16(view, position[1], 3);
    arrWriteUint16(view, position[2], 5);
  }

  sendSocketConnect() {
    this.sendSocket(this.sendSocketGetConnect());
  }

  sendSocketGetConnect() {
    const type = new Uint8Array([this.send.connect]);
    const key = new TextEncoder().encode(getPublicKey());
    const arrayBuffer = new ArrayBuffer(type.length + key.length);
    const result = new Uint8Array(arrayBuffer);
    result.set(type, 0);
    result.set(key, type.length);
    return arrayBuffer;
  }

  sendSocketHpLoss(lossType: number) {
    this.views.hpLoss[0] = this.send.hpLoss;
    this.views.hpLoss[1] = lossType;
    this.sendSocket(this.buffers.hpLoss);
  }

  sendSocketUpgrade() {
    this.views.upgrade[0] = this.send.upgrade;
    this.sendSocket(this.buffers.upgrade);
  }

  sendSocketLeaveQueue() {
    this.resetId();
    this.views.leaveQueue[0] = this.send.leaveQueue;
    const currPos =
      (SGG.getGameQueuePos && (SGG.getGameQueuePos() as number)) ?? 0;
    arrWriteUint16(this.views.leaveQueue, currPos, 1);
    this.sendSocket(this.buffers.leaveQueue);
  }

  sendHitPlayer(opponentId: number) {
    const position = CIPlayerPhys.position;
    this.views.hitPlayer[0] = this.send.hitPlayer;

    const x = Math.round((position[0] + LIN_POS_OFFSET_X) * LIN_POS_RATIO); // 2^16/12 = 546 of width.   +50 -> begin at -50
    const y = Math.round(
      (position[1] - 0.65 + LIN_POS_OFFSET_Y) * LIN_POS_RATIO,
    );
    const z = Math.round((position[2] + LIN_POS_OFFSET_Z) * LIN_POS_RATIO);

    arrWriteUint16(this.views.hitPlayer, x, 1);
    arrWriteUint16(this.views.hitPlayer, y, 3);
    arrWriteUint16(this.views.hitPlayer, z, 5);
    arrWriteUint16(this.views.hitPlayer, opponentId, 7);
    this.sendSocket(this.buffers.hitPlayer);
  }

  sendPlaceBomb(position: T3DP, bombType: number = 2) {
    if (!Number.isInteger(bombType) || bombType < 1 || bombType > 5) {
      console.error(`[SECURITY] Invalid bomb type ${bombType}, aborting send`);
      return;
    }

    this.views.placeBomb[0] = this.send.placeBomb;
    arrWriteInt16(this.views.placeBomb, position[0], 1);
    arrWriteInt16(this.views.placeBomb, position[1], 3);
    arrWriteInt16(this.views.placeBomb, position[2], 5);
    this.views.placeBomb[7] = bombType;
    this.sendSocket(this.buffers.placeBomb);
  }

  initSocket(
    socket: WebSocket,
    msg: ArrayBuffer | undefined,
    socketType: string,
  ) {
    socket.onerror = (event) => {
      this.onError(event); // TODO display error message to the user
    };
    socket.onopen = () => {
      this.onOpen(socketType, msg, socket);
    };
    socket.onclose = (event) => {
      this.onClose(event);
    };
    socket.onmessage = (event) => {
      this.onMessage(event, socket);
    };
  }

  private onError(event: Event) {
    console.warn(event);
  }

  private onOpen(
    socketType: string,
    msg: ArrayBuffer | undefined,
    socket: WebSocket,
  ) {
    if (socketType === "player") {
      this.socketViewer.close(1000, "Switching server");
    } else if (socketType === "viewer") {
      this.socketPlayer?.close(1000, "Switching server");
    }
    if (msg !== undefined) {
      socket.send(msg);
    }
  }

  private onClose(event: CloseEvent) {
    // if current socket is viewer and readystate is closed, then reconnect to the viewer

    if (event.code === 3000) {
      this.quitGame(CIAlertMng.dialogs.kicked);
    } else if (event.code === 3001) {
      // death
      this.quitGame(CIAlertMng.dialogs.dead);
      CISoundMng?.soundsFx.dead.updateSound();
      CIPlayer.updateHealth(CIPlayer.health.val.max);
    } else if (event.code === 1000) {
      // Intentional socket swap (player ↔ viewer); no action needed.
    } else if (SGG.getIsInGame()) {
      this.quitGame(CIAlertMng.dialogs.connectionLost);
    } else if (
      this.currSocket === this.socketPlayer &&
      this.currSocket.readyState === WebSocket.CLOSED
    ) {
      console.error(event);
      this.quitGame(CIAlertMng.dialogs.connectionLost);
    }
  }
  private onMessage(event: MessageEvent<any>, socket: WebSocket) {
    const message = new Uint8Array(event.data);

    const type = arrReadUint8(message, 0);
    if (type === this.receive.players_positions) {
      const nbPlayers =
        (message.byteLength - PROTOCOL.PLAYER_RECORDS_START) /
        PROTOCOL.PLAYER_RECORD_BYTES;
      const opponents = CIOpponents.players;
      const currTimeTemp = performance.now();

      for (let i = 0; i < nbPlayers; i++) {
        const offsetID = i * PROTOCOL.PLAYER_RECORD_BYTES;

        const id_ = arrReadUint16(
          message,
          offsetID + PROTOCOL.PLAYER_OFFSET.id,
        ).toString();

        if (id_ === this.id) continue;
        if (opponents[id_] !== undefined) {
          const currPlayer = opponents[id_];
          currPlayer.oldPos = currPlayer.newPos;

          const dataContainer =
            arrReadUint8(
              message,
              offsetID + PROTOCOL.PLAYER_OFFSET.dataContainer,
            ) || 0;
          const movingIntensity = dataContainer & UINT2_MAX;
          const isFlying = (dataContainer >> 2) & 1;
          const oriOffsetFromData = (dataContainer >> 3) & UINT3_MAX;
          const hammerHitFromData = (dataContainer >> 6) & 1;
          const headRX =
            HEAD_ROT_X_LUT[
              arrReadUint8(message, offsetID + PROTOCOL.PLAYER_OFFSET.rotX)
            ] || 0;
          const headRY =
            HEAD_ROT_Y_LUT[
              arrReadUint8(message, offsetID + PROTOCOL.PLAYER_OFFSET.rotY)
            ] || 0;
          const oriOffset = orOffsets[oriOffsetFromData];
          const bodyRot = headRY - oriOffset;

          let flyingRot;
          let sinSpeed;
          let axeRx;
          if (isFlying) {
            const timeSec = currPlayer.newPackageTime * 0.02;
            flyingRot = (Math.sin(timeSec) + 1) * PID3; // equivalent to(PID2/2)
            sinSpeed = 0;
          } else {
            sinSpeed =
              Math.sin(currPlayer.newPackageTime / 110) *
              legIntensity[movingIntensity];
            flyingRot = 0;
          }

          if (hammerHitFromData) {
            currPlayer.hammerRot = -0.5;
          }
          if (currPlayer.hammerRot < -0.009) {
            const minRx = Math.max(headRX + PID2, PID8);
            axeRx = minRx + currPlayer.hammerRot * 1.3;
            currPlayer.hammerRot = THREE.MathUtils.lerp(
              currPlayer.hammerRot,
              0,
              0.13,
            );
            currPlayer.hammerTrans = axeRx;
          } else if (isFlying) {
            axeRx = PI;
          } else {
            currPlayer.hammerTrans = THREE.MathUtils.lerp(
              currPlayer.hammerTrans,
              0,
              0.1,
            );
            currPlayer.hammerOffset = movingIntensity
              ? sinSpeed / 4 - PID8
              : THREE.MathUtils.lerp(currPlayer.hammerOffset, 0, 0.1);

            axeRx = currPlayer.hammerTrans - currPlayer.hammerOffset;
          }

          const px =
            arrReadUint16(message, offsetID + PROTOCOL.PLAYER_OFFSET.posX) *
              LIN_POS_RATIO_INV -
              LIN_POS_OFFSET_X || 0;
          const py =
            arrReadUint16(message, offsetID + PROTOCOL.PLAYER_OFFSET.posY) *
              LIN_POS_RATIO_INV -
              LIN_POS_OFFSET_Y || 0;
          const pz =
            arrReadUint16(message, offsetID + PROTOCOL.PLAYER_OFFSET.posZ) *
              LIN_POS_RATIO_INV -
              LIN_POS_OFFSET_Z || 0;
          currPlayer.placedPos = [px, py, pz];
          currPlayer.newPos = [
            px,
            py,
            pz,
            bodyRot,
            headRX,
            headRY,
            axeRx,
            sinSpeed,
            flyingRot,
          ];
          if (currPlayer.oldPos[0] === OFF_WORLD_COORD) {
            currPlayer.oldPos = currPlayer.newPos;
          }
          currPlayer.oldPackageTime = currPlayer.newPackageTime;
          currPlayer.newPackageTime = currTimeTemp;
          currPlayer.recompute = true;
        }
      }
    } else if (type === this.receive.voxel_hp) {
      const currHP = arrReadUint32(message, 1);
      if (currHP <= 0) {
        const pos: T3DP = readVoxelPos(message, 5);
        // described above
        workerPool.setDestructionEvent(pos);
      }
      CIHUD.eInfo.hp = currHP;
    } else if (type === this.receive.voxel_hp_hit) {
      const currHP = arrReadUint32(message, 1);
      CIHUD.eInfo.hp = currHP;
      this.lastGetHpCall = performance.now();

      CISoundMng?.soundsFx.hitCube.updateSound(CIPlayerPhys.position);

      emitter.emit("cubeHitted", CICollisionFinder.lastHittedPos, NORMAL_HIT);

      CIHUD.damageMarkerTempDiv(NORMAL_HIT);
    } else if (type === this.receive.voxel_hp_critical_hit) {
      const currHP = arrReadUint32(message, 1);
      CIHUD.eInfo.hp = currHP;
      this.lastGetHpCall = performance.now();

      CISoundMng?.soundsFx.hitCube.updateSound(CIPlayerPhys.position);

      emitter.emit("cubeHitted", CICollisionFinder.lastHittedPos, CRITICAL_HIT);

      CIHUD.damageMarkerTempDiv(CRITICAL_HIT);
    } else if (type === this.receive.voxel_destroyed) {
      const id_ = arrReadUint16(message, 1).toString();
      const pos: T3DP = readVoxelPos(message, 3);
      const money = arrReadUint32(message, 9);
      const newHP = arrReadUint8(message, 13);
      const enemy = arrReadUint8(message, 14);
      const nftId = arrReadUint16(message, 15);
      if (nftId !== 0) {
        CISoundMng?.soundsFx.nftSound.updateSound();
        emitter.emit("snackBarEvent", {
          type: "nftWin",
          playerName:
            id_ === this.id
              ? SGG.getUsername()
              : (CIOpponents.players[id_]?.username ?? ""),
        });
      }
      const world = getWorld();
      // syncVoxel guards against duplicate server messages: the voxel is zeroed
      // only once the worker has processed it (getSyncVoxel tracks that state).
      if (SGG.getReadyToRender()) {
        const syncVoxelType = world.getSyncVoxel(...pos);
        if (syncVoxelType !== null && syncVoxelType > 0) {
          world.setSyncVoxel(...pos, 0);

          const voxelType = world.getVoxel(...pos);
          if (voxelType !== null) {
            if (id_ === this.id && voxelType > 0) {
              CIPlayer.setHealth(newHP);
              CIDestroyedAnim.setSelfDestruct(
                pos,
                voxelType,
                money,
                newHP,
                enemy,
                nftId,
              );
            }
            workerPool.setDestructionEvent(pos);
          }
        }
      } else {
        workerPool.addInitSynchroToDestroy(pos);
      }
    } else if (type === this.receive.player_hit) {
      const hittedPlayerId = arrReadUint16(message, 7);
      if (hittedPlayerId !== Number(this.id)) return;

      const opponentPos = readWorldPos(message, 1);

      const hitPower = Math.pow(arrReadUint8(message, 9), 0.85);

      const playerPos = dummyVec2.set(...CIPlayerPhys.position);
      const cubePos = dummyVec3.set(...opponentPos);
      dummyVec1.subVectors(playerPos, cubePos);
      dummyVec1.multiplyScalar(hitPower * 2);

      const dirArray = [dummyVec1.x, dummyVec1.y + 2, dummyVec1.z] as T3DP;
      CIPlayerPhys.damageRebound(dirArray, 0);
    } else if (type === this.receive.player_updated_skin) {
      const userId = arrReadUint16(message, 1).toString();
      const skinId = arrReadUint8(message, 3);
      if (CIOpponents?.players?.[userId]) {
        CIOpponents.players[userId].skinId = skinId;
      }
    } else if (type === this.receive.authentication) {
      this.id = arrReadUint16(message, 1).toString();
      const [x, y] = readWorldPos(message, 3);
      const placeSelf = (layer: number) => {
        CIPlayerPhys.position = [x, y, spawnZForLayer(layer)];
        setSelfPlayer(CIPlayerPhys.position);
      };
      if (CIMetacubeStates.layerInitialized) {
        placeSelf(CIMetacubeStates.currentLayer);
      } else {
        const sub = emitter.addListener("initLayer", (layer: number) => {
          sub.remove();
          placeSelf(layer);
        });
      }
      SAG.setIsInGame(true);
      setDeep("currentNotification", "welcome");
      CIAlertMng.dialogs.nothing.emit();
    } else if (type === this.receive.player_disconnected) {
      const disconnectedPlayerId = arrReadUint16(message, 1).toString();

      CIBombManager.removePlayerBombs(disconnectedPlayerId);

      CIOpponents.addToBeFree(disconnectedPlayerId);
    } else if (type === this.receive.player_connected) {
      const userId = arrReadUint16(message, 1).toString();
      const skinId = arrReadUint8(message, 3);
      const usernameLength = arrReadUint8(message, 4);
      const username = arrReadString(message, 5, usernameLength);

      const opponents = CIOpponents.players;
      const currTimeTemp = performance.now();
      const newPlayer: TPlayer = {
        newPos: [
          OFF_WORLD_COORD,
          OFF_WORLD_COORD,
          OFF_WORLD_COORD,
          0,
          0,
          0,
          0,
          0,
          0,
        ],
        oldPos: [
          OFF_WORLD_COORD,
          OFF_WORLD_COORD,
          OFF_WORLD_COORD,
          0,
          0,
          0,
          0,
          0,
          0,
        ],
        posDiff: [],
        newPackageTime: currTimeTemp,
        oldPackageTime: currTimeTemp - 1,
        recompute: true,
        username: username,
        textID: null,
        invTimeDiff: 0,
        hammerOffset: 0,
        hammerRot: 0,
        hammerTrans: 0,
        skinId: skinId,
      };
      opponents[userId] = newPlayer;
      setNewConnectedPlayers(userId, opponents[userId]);
      if (userId === this.id) {
        setSelectedSkinStateGL(skinId);
        CIUpgradeMng.setAllUpgradeOnSkinChange();
      }
    } else if (type === this.receive.dead_player) {
      const deadPlayerId = arrReadUint16(message, 1).toString();
      const cause = arrReadUint8(message, 3);

      CIBombManager.removePlayerBombs(deadPlayerId);

      const currPlayer = CIOpponents.players[deadPlayerId];
      if (currPlayer) {
        const currPlayerName = currPlayer?.username ?? "";
        const deadPos = currPlayer.newPos;
        CIOpponentsParticles.init([deadPos[0], deadPos[1], deadPos[2]], 2);
        emitter.emit("snackBarEvent", {
          type: "death",
          playerName: currPlayerName,
          cause: cause,
        });
      }
    } else if (type === this.receive.next_player) {
      const serverId = arrReadUint8(message, 1);
      const publicKey = arrReadString(message, 2, 64);

      if (publicKey === getPublicKey()) {
        this.enterGame(serverId);
      } else {
        SAG.decreaseGameQueuePos();
      }
    } else if (type === this.receive.leave_queue) {
      const position = arrReadUint16(message, 1);
      const currentPos = (SGG.getGameQueuePos &&
        SGG.getGameQueuePos()) as number;
      if (currentPos !== undefined && position < currentPos) {
        SAG.decreaseGameQueuePos();
      }
    } else if (type === this.receive.start_maintenance) {
      socket.close(1000, "Maintenance");
      getDisconnect().catch((err: unknown) => {
        console.error("[Socket] disconnect during maintenance failed:", err);
      });
      window.location.reload();
    } else if (type === this.receive.change_layer) {
      const currGameLayer = arrReadUint8(message, 1);
      CIMetacubeStates.setCurrGameLayer(currGameLayer);
      postLayerAchievement(currGameLayer > 7 ? 0 : currGameLayer);
      workerPool.postLayerChange(currGameLayer > 7 ? 0 : currGameLayer);
      emitter.emit("changeLayer", currGameLayer);
    } else if (type === this.receive.achievement_notification) {
      const category = arrReadUint8(message, 65);
      const notifType = arrReadUint8(message, 66);
      const achievement = arrReadUint8(message, 67);

      SAnotifyAction(category, notifType, achievement);
    } else if (type === this.receive.bomb_placed) {
      const x = arrReadInt16(message, 1);
      const y = arrReadInt16(message, 3);
      const z = arrReadInt16(message, 5);
      const placerPlayerId = arrReadUint16(message, 7).toString();

      // Default to STANDARD if the message predates the bomb-type field.
      let bombType = message.byteLength >= 10 ? arrReadUint8(message, 9) : 2;

      if (!Number.isInteger(bombType) || bombType < 1 || bombType > 5) {
        console.warn(
          `[Socket] Invalid bomb type received: ${bombType}, defaulting to STANDARD`,
        );
        bombType = 2;
      }

      // Local player's visual is already placed; only spawn for others.
      if (placerPlayerId !== this.id) {
        // X and Z are sent as floored integers; re-centre to voxel midpoint.
        const bombPos: T3DP = [x + 0.5, y, z + 0.5];
        CIBombManager.placeBombRemote(bombPos, placerPlayerId, bombType);
      }
    } else if (type === this.receive.bomb_exploded) {
      const x = arrReadInt16(message, 1);
      const y = arrReadInt16(message, 3);
      const z = arrReadInt16(message, 5);
      const ownerPlayerId = arrReadUint16(message, 7).toString();
      const bombPos: T3DP = [x + 0.5, y, z + 0.5];
      CIBombManager.triggerRemoteExplosion(bombPos, ownerPlayerId);
    } else if (process.env.NODE_ENV === "development") {
      console.warn(`[Socket] Unknown message type: ${type}`);
    }
  }
}

export const CISocketMng = new CSocketMng();

// Also close on hard unload; App.tsx's effect covers route-level unmount.
window.addEventListener("beforeunload", () => CISocketMng.disconnect());
