import { CISoundMng } from "./../../sound/soundFX";
import { PI, PID2, PID3, PID8 } from "../../helpers/PI";
import * as THREE from "three";
import { type T3DP } from "../../Types/T3DP";
import { CEntityGen } from "./EntityClasses";
import { CState } from "../../helpers/CState";
import { CIHUD } from "../../menu/HUD/hudInfo";
import {
  CISocketMng,
  legIntensity,
  orOffsets,
  UINT2_MAX,
  UINT3_MAX,
} from "../../API/socketMessagesManager";
import { getMMovement, getMovement, setMovement } from "./playerControls";
import { setCanClick } from "../components/CubeHitted";
import emitter from "../../helpers/EventEmitter";
import {
  LIN_POS_OFFSET_X,
  LIN_POS_OFFSET_Y,
  LIN_POS_OFFSET_Z,
  LIN_POS_RATIO,
  OFF_WORLD_COORD,
  WORLD_BOUNDARIES,
} from "../../helpers/worldBoundaries";
import { SGG } from "../../menu/useGeneralStore";
import { setDeep } from "../../menu/subMenus/NavigationBar/Model/notifTips/store";
import { CIOpponents } from "./computeOpponentsData";
import { HEAD_ROT_Y_LUT } from "../../helpers/headRotationLut";
import { HEAD_ROT_X_LUT } from "../../helpers/headRotationLut";
import { spawnPositionForLayer } from "../../world/model/layerBounds";
import { CIMetacubeStates } from "../../world/model/MetacubeStates";
const PLAYERHEIGHT = 1.5;
const PI2 = 2 * PI;

const MINSPEED = 0.15;

const LOWESTVELY = -60;
const HIGHESTVELYFLY = 8;
const HIGHESTVELY = 14;

const SPRINTGAIN = 1.7;
const SPRINTLOSS = 5;
const SPRINTMAX = 5;

const SPRINTMIN = 1;
const ACCELERATION = [27, 13, 27];
const ACCELERATION_2 = [19.091, 13, 19.091]; // diagonal: ACCELERATION[0] / sqrt(2)
const FLIGHTACCEL = 95;
const DECELERATION = [-10, -9.8 * 6.3, -10];

const FALLDAMAGETHRESHOLD = 45;

export interface THealth {
  curr: number;
  max: number;
}
interface TEndurance {
  curr: number;
  max: number;
  factor: number;
}

class CPlayer {
  private evPrefix = "player_";
  public damage = new CState<number>(this.evPrefix + "damage", 0);
  public health = new CState<THealth>(this.evPrefix + "health_curr", {
    curr: 0,
    max: 0,
  });
  public endurance = new CState<TEndurance>(this.evPrefix + "endurance_curr", {
    curr: 0,
    max: 0,
    factor: 0,
  });
  public attackRange = new CState<number>(this.evPrefix + "attackRange", 0);
  public criticalHit = new CState<number>(this.evPrefix + "criticalHit", 0);
  public multiplier = new CState<[number, number]>(
    this.evPrefix + "multiplier",
    [0, 0],
  );
  public money = new CState<number>(this.evPrefix + "money", 0);

  resetAllStatsAsInitial() {
    const moneyDelta = 0 - this.money.val;
    this.damage.val = 0;
    this.attackRange.val = 0;
    this.criticalHit.val = 0;
    this.multiplier.val = [0, 0];
    this.money.val = 0;
    this.endurance.val = {
      curr: 0,
      max: 0,
      factor: 0,
    };
    this.health.val = {
      curr: 0,
      max: 0,
    };
    this.damage.sendEvent();
    this.endurance.sendEvent();
    this.health.sendEvent();
    this.money.sendEvent(moneyDelta);
    this.attackRange.sendEvent();
    this.criticalHit.sendEvent();
    this.multiplier.sendEvent();
  }

  resetStats(health: number, money: number) {
    const moneyDelta = money - this.money.val;
    this.health.val.curr = health;
    this.money.val = money;
    this.money.sendEvent(moneyDelta);
    emitter.emit("menuMoney", money);
  }

  updateMaxEndurance(enduranceMax: number) {
    this.endurance.val = {
      curr: enduranceMax,
      max: enduranceMax,
      factor: enduranceMax / 60,
    };
    this.endurance.sendEvent();
  }

  updateMaxEnduranceOnly(enduranceMax: number) {
    const currVal = this.endurance.val.curr;
    this.endurance.val = {
      curr: currVal,
      max: enduranceMax,
      factor: enduranceMax / 60,
    };
    this.endurance.sendEvent();
  }
  updateMaxHealth(health: number) {
    this.health.val = {
      curr: health,
      max: health,
    };
    this.health.sendEvent();
  }

  updateHealth(health: number) {
    this.health.val.curr += health;
    this.health.sendEvent();
  }

  setHealth(curr: number) {
    this.health.val.curr = curr;
    this.health.sendEvent();
  }

  updateAttackRange(range: number) {
    this.attackRange.val = range;
  }
  updateMoney(moneyChange: number) {
    this.money.val += moneyChange;
    if (this.money.val < 0) this.money.val = 0;
    this.money.sendEvent(moneyChange);
    emitter.emit("menuMoney", this.money.val);
  }
}

export const CIPlayer = new CPlayer();

class CPlayerPhys extends CEntityGen {
  delta: number;
  oldEndurance: number;
  sprintMult: number;
  oldPositionXZ: [number, number];
  pushback: THREE.Vector3;
  jumped: boolean;
  canJump: boolean;
  canFly: number;
  isFlying: boolean;
  sprintEnduranceCond: boolean;
  sendHammerHit: boolean;
  sendAnywayTime: number;

  animRotSend: number;
  animRotX: number;
  animRotZ: number;

  ROTATION: THREE.Vector3;
  front: THREE.Vector3;
  sideways: THREE.Vector3;
  lastBackendPos: number[];
  backendSignal: boolean;
  oriOffset: number;
  speedSinus: number;
  animTrans: number;
  moveOffset: number;
  velocityMagnitude: number;
  private hammerHitAnimSending: boolean;
  private hammerHitAnimSendingTimer: NodeJS.Timeout | null;
  private inTheAir: boolean = true;
  public deActivateJump = false;

  constructor(hitBoxLow: T3DP, hitBoxHigh: T3DP) {
    super(hitBoxLow, hitBoxHigh);
    this.position = [0, 0, 0];

    this.delta = 0;
    this.sprintMult = 1;
    this.oldPositionXZ = [OFF_WORLD_COORD, OFF_WORLD_COORD];
    this.jumped = false;
    this.canJump = false;
    this.canFly = 0;
    this.isFlying = false;

    this.oldEndurance = 0;
    this.animRotX = 0;
    this.animRotZ = 0;
    this.animRotSend = 0;

    this.sprintEnduranceCond = false;
    this.ROTATION = new THREE.Vector3(0, 0, 0);
    this.front = new THREE.Vector3();
    this.sideways = new THREE.Vector3();
    this.pushback = new THREE.Vector3(0, 0, 0);
    this.lastBackendPos = [];

    this.oriOffset = 0;
    this.speedSinus = 0;
    this.animTrans = 0;
    this.moveOffset = 0;
    this.velocity = [0, 0, 0];
    this.velocityMagnitude = 0;
    this.backendSignal = false;
    this.sendHammerHit = false;
    this.hammerHitAnimSending = false;
    this.hammerHitAnimSendingTimer = null;
    this.sendAnywayTime = Date.now();
  }

  private init() {
    this.delta = 0;
    this.sprintMult = 1;
    this.oldPositionXZ = [OFF_WORLD_COORD, OFF_WORLD_COORD];
    this.jumped = false;
    this.canJump = false;
    this.canFly = 0;
    this.isFlying = false;

    this.oldEndurance = 0;
    CIPlayer.endurance.val.curr = CIPlayer.endurance.val.max;
    this.animRotX = 0;
    this.animRotZ = 0;
    this.animRotSend = 0;

    this.sprintEnduranceCond = false;
    this.ROTATION = new THREE.Vector3(0, 0, 0);
    this.front = new THREE.Vector3();
    this.sideways = new THREE.Vector3();
    this.pushback = new THREE.Vector3(0, 0, 0);
    this.lastBackendPos = [];
    this.hammerHitAnimSending = false;
    this.oriOffset = 0;
    this.speedSinus = 0;
    this.animTrans = 0;
    this.moveOffset = 0;
    this.velocity = [0, 0, 0];
    this.velocityMagnitude = 0;
    this.backendSignal = true;
    this.sendHammerHit = false;
  }

  initPlayer() {
    this.init();
  }

  update(
    elapsedTime: number,
    delta: number,
    tempPos: T3DP,
    camera: THREE.Camera,
    isDesktop: boolean,
  ) {
    const { forward, backward, left, right, jump, sprint, fly } = getMovement();
    this.position = tempPos;

    delta = Math.abs(delta);
    this.delta = Math.min(delta, 0.1);
    this.isFlying = false;
    this.jumped = false;

    this.computeDeceleration();
    this.enduranceGain(jump, sprint, fly);
    const menuDisplay = SGG.getMenuDisplay();
    const chatDisplay = SGG.getChatFocus();
    if (menuDisplay || chatDisplay) {
      this.jumpFly(false, false);
      this.speedGainCompute(false, false, false, false, false, true);
    } else {
      this.jumpFly(jump, fly);
      this.speedGainCompute(sprint, right, forward, left, backward, isDesktop);
    }
    this.frontSideCompute(camera); // prettier-ignore

    this.translateDirSpec(
      this.sideways.x + this.front.x + this.pushback.x * this.delta,
      0,
    );
    this.translateDirSpec(
      this.sideways.z + this.front.z + this.pushback.z * this.delta,
      2,
    );

    this.canJump = false;

    const collisionY = this.translateDirSpec(
      (this.velocity[1] + this.pushback.y) * this.delta,
      1,
    );
    this.floorTouching(collisionY, this.velocity[1]);

    this.checkBoundaries();
    this.nullifyLowSpeed(menuDisplay);

    this.velocityMagnitude =
      this.velocity[0] * this.velocity[0] + this.velocity[2] * this.velocity[2];

    this.axeAnimation(
      Number(this.velocity[0] !== 0 || this.velocity[2] !== 0),
      elapsedTime,
    );

    const rotations_y = this.rotation_y(
      camera.rotation.x,
      camera.quaternion.x,
      camera.quaternion.z,
    );
    this.move(...this.position, rotations_y, camera);

    this.backendSignal = !this.backendSignal;

    if (this.deActivateJump) {
      setMovement("jump", false);
    }
  }

  computeDeceleration() {
    this.velocity[0] += this.velocity[0] * DECELERATION[0] * this.delta;
    this.velocity[1] += DECELERATION[1] * this.delta;
    this.velocity[2] += this.velocity[2] * DECELERATION[2] * this.delta;

    this.velocity[1] = Math.min(
      Math.max(this.velocity[1], LOWESTVELY),
      HIGHESTVELY,
    );

    this.pushback.x += this.pushback.x * DECELERATION[0] * this.delta;
    this.pushback.z += this.pushback.z * DECELERATION[2] * this.delta;
    this.pushback.x = Math.abs(this.pushback.x) < 0.1 ? 0 : this.pushback.x;
    this.pushback.z = Math.abs(this.pushback.z) < 0.1 ? 0 : this.pushback.z;

    if (this.pushback.y > 0) {
      this.pushback.y += DECELERATION[1] * this.delta;
      this.pushback.y = this.pushback.y < 0.1 ? 0 : this.pushback.y;
    } else if (this.pushback.y < 0) {
      this.pushback.y -= DECELERATION[1] * this.delta;
      this.pushback.y = this.pushback.y > -0.1 ? 0 : this.pushback.y;
    }
  }

  enduranceGain(jump: boolean, sprint: boolean, fly: boolean) {
    const squareSpeed =
      this.velocity[0] * this.velocity[0] + this.velocity[2] * this.velocity[2];
    this.sprintEnduranceCond = sprint && squareSpeed > 0.1;
    if (
      (!this.canFly || this.canJump || !jump) &&
      !this.sprintEnduranceCond &&
      !fly
    ) {
      CIPlayer.endurance.val.curr += CIPlayer.endurance.val.factor * this.delta;
      if (CIPlayer.endurance.val.curr > CIPlayer.endurance.val.max) {
        CIPlayer.endurance.val.curr = CIPlayer.endurance.val.max;
      }
    }
  }

  jumpFly(jump: boolean, fly: boolean) {
    if (fly) {
      CIPlayer.endurance.val.curr -= this.delta;
      if (CIPlayer.endurance.val.curr > 0.05) {
        this.isFlying = true;
        this.velocity[1] = Math.min(
          this.velocity[1] + FLIGHTACCEL * this.delta,
          HIGHESTVELYFLY,
        );
      } else {
        CIPlayer.endurance.val.curr = 0;
      }
    } else if (!this.canJump && jump) {
      if (this.canFly) {
        CIPlayer.endurance.val.curr -= this.delta;
        if (CIPlayer.endurance.val.curr > 0.05) {
          this.isFlying = true;
          this.velocity[1] = Math.min(
            this.velocity[1] + FLIGHTACCEL * this.delta,
            HIGHESTVELYFLY,
          );
        } else {
          CIPlayer.endurance.val.curr = 0;
        }
      }
    } else if (!this.canJump && !jump) {
      this.canFly = 1;
    } else if (jump) {
      if (this.canJump && this.velocity[1] <= 0) {
        this.jumped = true;
        this.velocity[1] = Math.min(
          this.velocity[1] + ACCELERATION[1],
          HIGHESTVELY,
        );
        this.canFly = 0;
      }
    } else {
      this.canFly = 0;
    }
  }

  speedGainCompute(
    sprint: boolean,
    right: boolean,
    forward: boolean,
    left: boolean,
    backward: boolean,
    isDesktop: boolean,
  ) {
    this.sprintCompute(sprint);
    let addSpeedX;
    let addSpeedZ;
    this.oriOffset = 0;
    let accelerationCorr = ACCELERATION_2;
    let rightF = Number(right);
    let leftF = Number(left);
    let forwardF = Number(forward);
    let backwardF = Number(backward);
    if (!isDesktop) {
      accelerationCorr = ACCELERATION;
      const { forwardM, backwardM, leftM, rightM } = getMMovement();
      rightF = rightM;
      leftF = leftM;
      forwardF = forwardM;
      backwardF = backwardM;
    }
    const deltaSprint = this.delta * this.sprintMult;
    if ((right && forward) || (left && backward)) {
      this.oriOffset = 1;
      addSpeedX = accelerationCorr[0] * deltaSprint;
      addSpeedZ = accelerationCorr[2] * deltaSprint;
    } else if ((left && forward) || (right && backward)) {
      this.oriOffset = 2;
      addSpeedX = accelerationCorr[0] * deltaSprint;
      addSpeedZ = accelerationCorr[2] * deltaSprint;
    } else {
      addSpeedX = ACCELERATION[0] * deltaSprint;
      addSpeedZ = ACCELERATION[2] * deltaSprint;
      if (right) {
        this.oriOffset = 3;
      } else if (left) {
        this.oriOffset = 4;
      }
    }

    this.velocity[0] += (rightF - leftF) * addSpeedX;
    this.velocity[2] += (backwardF - forwardF) * addSpeedZ;
  }

  private sprintCompute(sprint: boolean) {
    if (sprint) {
      if (this.sprintEnduranceCond) {
        CIPlayer.endurance.val.curr -= this.delta;
      }
      if (CIPlayer.endurance.val.curr <= 0) {
        CIPlayer.endurance.val.curr = 0;
        this.sprintMult = Math.max(
          this.sprintMult - SPRINTLOSS * this.delta,
          SPRINTMIN,
        );
      } else {
        this.sprintMult = Math.min(
          this.sprintMult + SPRINTGAIN * this.delta,
          SPRINTMAX,
        );
      }
    } else {
      this.sprintMult = Math.max(
        this.sprintMult - SPRINTLOSS * this.delta,
        SPRINTMIN,
      );
    }
  }

  frontSideCompute(camera: THREE.Camera) {
    this.front.set(0, 0, 1).applyQuaternion(camera.quaternion);
    this.front.y = 0;
    this.front.normalize().multiplyScalar(this.velocity[2] * this.delta);
    this.sideways
      .set(1, 0, 0)
      .applyQuaternion(camera.quaternion)
      .normalize()
      .multiplyScalar(this.velocity[0] * this.delta);
  }

  translateDirSpec(dirTrans: number, dir: number): boolean {
    return this.translateDir(this.position, dir, dirTrans);
  }

  floorTouching(collisionY: boolean, dirTrans: number) {
    if (collisionY) {
      if (dirTrans < 0) {
        if (this.inTheAir === true) {
          CISoundMng?.soundsFx.landing.updateSound([
            this.position[0],
            this.position[1] - 1,
            this.position[2],
          ]);
        }
        this.canJump = true;

        this.fallDamage();
        this.inTheAir = false;
      } else {
        this.inTheAir = true;
      }
    } else {
      this.inTheAir = true;
    }
  }

  fallDamage() {
    if (this.velocity[1] < -FALLDAMAGETHRESHOLD) {
      let damageType = 1;
      //  if velocity < 50 damage type1, <55 damage type 2
      if (this.velocity[1] > -51) {
        damageType = 1;
      } else if (this.velocity[1] > -56) {
        damageType = 2;
      } else {
        damageType = 3;
      }
      this.damageRebound([0, Math.pow(damageType, 0.6) * 16, 0], damageType);
      CISocketMng.sendSocketHpLoss(damageType - 1);
      setDeep("currentNotification", "fallDamage");
    }
    this.velocity[1] = 0;
  }

  damageRebound(pushback: [number, number, number], damage: number) {
    setCanClick(false);
    setTimeout(() => {
      setCanClick(true);
    }, 750);
    CISoundMng?.soundsFx.hurt.updateSound();
    CIHUD.bloodDamageDiv();
    CIPlayer.updateHealth(-damage);

    this.pushback.set(...pushback);
  }

  checkBoundaries() {
    if (this.position[0] <= WORLD_BOUNDARIES[0] + this.hitBoxLow[0]) {
      this.position[0] = WORLD_BOUNDARIES[0] + this.hitBoxLow[0];
    } else if (this.position[0] >= WORLD_BOUNDARIES[1] - this.hitBoxHigh[0]) {
      this.position[0] = WORLD_BOUNDARIES[1] - this.hitBoxHigh[0];
    }
    if (this.position[1] <= WORLD_BOUNDARIES[2] + this.hitBoxLow[1]) {
      // Fell to the bottom: respawn just outside the active layer's -Z face so
      // the player lands next to the current cube boundary, not in the hollow.
      this.position = spawnPositionForLayer(CIMetacubeStates.currentLayer);
      this.damageRebound([0, 0, 0], 3);
      CISocketMng.sendSocketHpLoss(2);
      this.velocity = [0, 0, 0];
    } else if (this.position[1] >= WORLD_BOUNDARIES[3] - this.hitBoxHigh[1]) {
      this.position[1] = WORLD_BOUNDARIES[3] - this.hitBoxHigh[1];
    }
    if (this.position[2] <= WORLD_BOUNDARIES[4] + this.hitBoxLow[2]) {
      this.position[2] = WORLD_BOUNDARIES[4] + this.hitBoxLow[2];
    } else if (this.position[2] >= WORLD_BOUNDARIES[5] - this.hitBoxHigh[2]) {
      this.position[2] = WORLD_BOUNDARIES[5] - this.hitBoxHigh[2];
    }
  }

  nullifyLowSpeed(menuDisplay: boolean) {
    // Kill velocity when the player is pushing against a wall (displacement below MINSPEED).
    const horiDispX = this.oldPositionXZ[0] - this.position[0];
    const horiDispZ = this.oldPositionXZ[1] - this.position[2];
    const horiDisp = Math.abs(horiDispX) + Math.abs(horiDispZ);

    if (horiDisp <= MINSPEED * this.delta) {
      this.velocity[0] = 0;
      this.velocity[2] = 0;
    }

    if (menuDisplay) return;
    this.oldPositionXZ[0] = this.position[0];
    this.oldPositionXZ[1] = this.position[2];
  }

  axeAnimation(velocityLen: number, elapsedTime: number) {
    let sinusCalc =
      Math.sin(velocityLen * elapsedTime * 9) *
      0.01 *
      Math.min(this.velocityMagnitude, 30);

    this.speedSinus =
      Math.sign(sinusCalc) * Math.sqrt(Math.abs(sinusCalc)) * 3.5;

    sinusCalc *= 0.8;
    this.animRotX = THREE.MathUtils.lerp(this.animRotX, sinusCalc, 0.13);
    this.animRotZ = THREE.MathUtils.lerp(this.animRotZ, sinusCalc, 0.13);
  }

  move(x: number, y: number, z: number, ry: number[], camera: THREE.Camera) {
    const UINT8_MAX = 0xff;

    const preX = LIN_POS_OFFSET_X * LIN_POS_RATIO;
    const preY = (LIN_POS_OFFSET_Y - 0.65) * LIN_POS_RATIO;
    const preZ = LIN_POS_OFFSET_Z * LIN_POS_RATIO;

    x = Math.round(x * LIN_POS_RATIO + preX);
    y = Math.round(y * LIN_POS_RATIO + preY);
    z = Math.round(z * LIN_POS_RATIO + preZ);

    const { quaternion } = camera;
    const headRx = 2 * Math.atan2(quaternion.y, quaternion.z);
    let headRxOffset = headRx - PI;
    headRxOffset = headRxOffset > -PI ? headRxOffset : headRxOffset + PI2;

    const sinSpeed = Math.min(Math.max(this.speedSinus, -PID2), PID2);
    let axeRx;

    if (this.animRotSend < -0.009) {
      const minRx = Math.max(headRxOffset + PID2, PI / 8);
      axeRx = minRx + this.animRotSend * 1.3;
      this.animRotSend *= 0.87;
      this.animTrans = axeRx;
    } else {
      this.animTrans *= 0.9;
      const isMoving = this.velocityMagnitude > 0.001;
      this.moveOffset = isMoving
        ? sinSpeed / 4 - PID2 / 4
        : this.moveOffset * 0.9;
      axeRx = this.isFlying ? PI : this.animTrans - this.moveOffset;
    }

    const ryFactor = UINT8_MAX / PI2;
    let _ry = Math.round((Math.abs(ry[1]) % PI2) * ryFactor);
    let headRy = Math.round((ry[0] + PI) * ryFactor);
    let finalHeadRx = Math.round((headRxOffset + PID2) * (UINT8_MAX / PI));

    _ry = _ry < 0 ? 0 : _ry > UINT8_MAX ? UINT8_MAX : _ry;
    headRy = headRy < 0 ? 0 : headRy > UINT8_MAX ? UINT8_MAX : headRy;
    finalHeadRx =
      finalHeadRx < 0 ? 0 : finalHeadRx > UINT8_MAX ? UINT8_MAX : finalHeadRx;

    let sinSpeedS = Math.round((this.velocityMagnitude * UINT2_MAX) / 25);
    sinSpeedS = sinSpeedS || (this.velocityMagnitude > 0.001 ? 1 : 0);
    sinSpeedS = Math.min(Math.max(sinSpeedS, 0), UINT2_MAX);

    if (this.sendHammerHit) {
      this.hammerHitAnimSending = true;
      if (this.hammerHitAnimSendingTimer) {
        clearTimeout(this.hammerHitAnimSendingTimer);
      }
      this.hammerHitAnimSendingTimer = setTimeout(() => {
        this.hammerHitAnimSending = false;
      }, 3000);
    }

    /*
     * dataContainer — packed uint8 sent to the server (and broadcast to other
     * clients as the per-player record's `dataContainer` byte; see
     * PROTOCOL.PLAYER_OFFSET.dataContainer in socketMessagesManager.ts).
     *
     *   bit 0-1: movingIntensity  (uint2, 0..3)     — sinSpeedS, walk/run anim phase
     *   bit 2  : isFlying         (uint1)
     *   bit 3-5: oriOffset        (uint3, 0..7)     — body-vs-head orientation slot
     *   bit 6  : sendHammerHit    (uint1)           — fires the hammer hit anim
     *   bit 7  : (unused, reserved)
     *
     * Decoded in computeForSelfPos() below and in socketMessagesManager's
     * players_positions handler (must stay in sync with the backend's packer).
     */
    const dataContainer =
      sinSpeedS |
      ((this.isFlying ? 1 : 0) << 2) |
      (this.oriOffset << 3) |
      ((this.sendHammerHit ? 1 : 0) << 6);

    const now = Date.now();
    const positionChanged =
      this.lastBackendPos[0] !== x ||
      this.lastBackendPos[1] !== y ||
      this.lastBackendPos[2] !== z;

    const rotationChanged =
      this.lastBackendPos[3] !== finalHeadRx ||
      this.lastBackendPos[4] !== headRy ||
      Math.abs(this.lastBackendPos[5] - axeRx) > 0.02;

    const stateChanged =
      this.lastBackendPos[6] !== dataContainer ||
      this.isFlying ||
      this.hammerHitAnimSending;

    const shouldSend =
      positionChanged ||
      rotationChanged ||
      stateChanged ||
      now - this.sendAnywayTime > 2000;

    if (shouldSend && this.backendSignal) {
      CISocketMng.sendSocketPos(
        [x, y, z],
        [finalHeadRx, headRy, dataContainer],
      );
      this.sendAnywayTime = now;
      this.sendHammerHit = false;
      this.lastBackendPos = [
        x,
        y,
        z,
        finalHeadRx,
        headRy,
        axeRx,
        dataContainer,
      ];
    }

    this.computeForSelfPos(dataContainer, finalHeadRx, headRy);
  }

  private computeForSelfPos(
    dataContainer: number,
    finalHeadRx: number,
    headRy: number,
  ) {
    const id = CISocketMng.id;
    const currPlayer = CIOpponents.players[id];
    if (!currPlayer) return;
    currPlayer.oldPos = currPlayer.newPos;
    currPlayer.recompute = true;
    currPlayer.oldPackageTime = currPlayer.newPackageTime;
    currPlayer.newPackageTime = performance.now();

    if (SGG.getIsThirdPerson()) {
      const movingIntensity = dataContainer & UINT2_MAX;
      const isFlying = (dataContainer >> 2) & 1;
      const oriOffsetFromData = (dataContainer >> 3) & UINT3_MAX;
      const hammerHitFromData = (dataContainer >> 6) & 1;
      const headRX = HEAD_ROT_X_LUT[finalHeadRx];
      const headRY = HEAD_ROT_Y_LUT[headRy];
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

      const px = this.position[0];
      const py = this.position[1] - 0.65;
      const pz = this.position[2];
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
    } else {
      CIOpponents.players[id].newPos = [-9000, -9000, -9000, 0, 0, 0, 0, 0, 0];
    }
  }

  rotation_y(heading: number, _x: number, _z: number) {
    const atanXZ = 2 * Math.atan2(_x, _z) + PI;
    const result =
      heading > 0
        ? [atanXZ - PI2, atanXZ - this.oriOffset]
        : [atanXZ, atanXZ + PI2 - this.oriOffset];
    return result;
  }
}

export const playerHitBoxMin = [0.3, PLAYERHEIGHT, 0.3] as T3DP;
export const playerHitBoxMax = [0.3, 0.3, 0.3] as T3DP;
export const CIPlayerPhys = new CPlayerPhys(playerHitBoxMin, playerHitBoxMax);
