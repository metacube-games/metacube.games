import { getMMovement, getMovement } from "./playerControls";
import * as THREE from "three";
import { CEntityGen } from "./EntityClasses";
import { type T3DP } from "../../Types/T3DP";
import { CIOpponents } from "./computeOpponentsData";
import { type TMesh } from "../../Types/TMesh";
import { WORLD_BOUNDARIES } from "../../helpers/worldBoundaries";
import { SGG } from "../../menu/useGeneralStore";
import emitter from "../../helpers/EventEmitter";

const DECELERATION = [-10, -10, -10];
const SPRINTGAIN = 1.7 * 6;
const SPRINTLOSS = 10;
const SPRINTMAX = 6;
const SPRINTMIN = 1;
const ACCELERATION = [25 * 3, 13 * 3, 25 * 3];
const ACCELERATION_2 = [17.677 * 4, 13 * 4, 17.677 * 4];

const FREE_VIEWER = 0;
const ROTATING = 1;
const FOLLOWING_PLAYER = 2;

// Center of the voxel world along each axis; the rotating menu camera orbits
// around this point and looks at it.
const WORLD_CENTER = 128;
// Horizontal radius of the rotating menu camera's circular orbit.
const MENU_CAMERA_ORBIT_RADIUS = 256;
// Height (y) of the rotating menu camera above the world.
const MENU_CAMERA_HEIGHT = 290;

class CMainViewer extends CEntityGen {
  private delta: number = 0;
  private sprintMult: number = 1;
  private front: THREE.Vector3 = new THREE.Vector3();
  private sideways: THREE.Vector3 = new THREE.Vector3();
  private upDown: THREE.Vector3 = new THREE.Vector3();
  private viewerType: number = ROTATING;
  public followedPlayerID: number = -1;
  private fPlayerIntPos: number[] = [];
  public quaternion: THREE.Quaternion = new THREE.Quaternion();

  setFollowingPlayerCamera(id: number) {
    this.followedPlayerID = id;
    this.viewerType = FOLLOWING_PLAYER;
  }

  setInterpolatedPosition(intPos: number[]) {
    this.fPlayerIntPos = intPos;
  }

  resetFollowedPlayer() {
    this.followedPlayerID = -1;
    emitter.emit("playerSelect", false);
  }

  setRotatingCamera() {
    this.viewerType = ROTATING;
    this.resetFollowedPlayer();
  }

  setFreeCamera() {
    this.viewerType = FREE_VIEWER;
    this.resetFollowedPlayer();
  }

  initViewer() {
    for (let i = 0; i < 3; i++) {
      const currBoxL = this.position[i] - this.hitBoxLow[i];
      const currBoxH = this.position[i] + this.hitBoxHigh[i];
      const a = Math.floor(currBoxL);
      const b = Math.floor(currBoxH);
      this.lastFloorL[i] = a;
      this.lastFloorH[i] = b;
    }
  }

  updateGeneral(
    delta: number,
    tempPos: T3DP,
    camera: THREE.Camera,
    isDesktop: boolean,
  ) {
    const menuDisplay = SGG.getMenuDisplay();
    const chatDisplay = SGG.getChatFocus();
    this.update(delta, tempPos, camera, menuDisplay, chatDisplay, isDesktop);

    if (this.viewerType === FREE_VIEWER) {
      // free viewer needs no per-frame update
    } else if (this.viewerType === ROTATING) {
      const { forward, backward, left, right } = getMovement();
      //if one is pressed, then the camera is rotating
      if (
        (forward || backward || left || right) &&
        !(menuDisplay || chatDisplay)
      ) {
        this.setFreeCamera();
        return;
      }
      // nothing to compute, camera side is handled by the renderer
    } else if (this.viewerType === FOLLOWING_PLAYER) {
      const { forward, backward, left, right } = getMovement();
      //if one is pressed, then the camera is rotating
      if (
        (forward || backward || left || right) &&
        !(menuDisplay || chatDisplay)
      ) {
        this.setFreeCamera();
        return;
      }
      // nothing to compute, camera side is handled by the renderer
    }
  }

  cameraHandlings(
    camera: THREE.Camera,
    mesh: React.RefObject<TMesh>,
    time: number,
  ) {
    time += 3.2; // phase offset so the rotating camera does not start at angle 0
    this.quaternion.copy(camera.quaternion);
    if (this.viewerType === FREE_VIEWER) {
      mesh.current.getWorldPosition(camera.position);
    } else if (this.viewerType === ROTATING) {
      camera.position.x =
        WORLD_CENTER + MENU_CAMERA_ORBIT_RADIUS * Math.cos(time);
      camera.position.z =
        WORLD_CENTER + MENU_CAMERA_ORBIT_RADIUS * Math.sin(time);
      camera.position.y = MENU_CAMERA_HEIGHT;
      camera.lookAt(WORLD_CENTER, WORLD_CENTER, WORLD_CENTER);
      mesh.current.position.copy(camera.position);
    } else if (this.viewerType === FOLLOWING_PLAYER) {
      if (
        !CIOpponents.players[this.followedPlayerID] ||
        !CIOpponents.players[this.followedPlayerID]?.username
      ) {
        this.setFreeCamera();
        return;
      }
      if (
        this.fPlayerIntPos === undefined ||
        this.fPlayerIntPos[0] === undefined
      ) {
        return;
      }
      camera.position.set(
        this.fPlayerIntPos[0],
        this.fPlayerIntPos[1] + 0.65,
        this.fPlayerIntPos[2],
      );
      camera.rotation.set(0, 0, 0);
      camera.rotateY(this.fPlayerIntPos[5]).rotateX(this.fPlayerIntPos[4]);
      mesh.current.position.copy(camera.position);
    }
  }

  update(
    delta: number,
    tempPos: T3DP,
    camera: THREE.Camera,
    menuDisplay: boolean,
    chatDisplay: boolean,
    isDesktop: boolean,
  ) {
    const { forward, backward, left, right, sprint } = getMovement();
    this.position = tempPos;
    this.delta = Math.min(delta, 0.1);

    this.computeDeceleration();
    // Do it only if the game is not paused
    if (!menuDisplay && !chatDisplay) {
      // Jump and fly logic

      // Compute velocities from acceleration and keyboard inputs
      this.speedGainCompute(sprint, right, forward, left, backward, isDesktop);

      this.frontSideCompute(camera);

      // Check if we can move in x direction
      // Find close voxels and return their hitboxes
      this.translateDir(
        this.position,
        0,
        this.sideways.x + this.front.x + this.upDown.x,
      );
      // Check if we can move in z direction
      // Find close voxels and return their hitboxes
      this.translateDir(
        this.position,
        2,
        this.sideways.z + this.front.z + this.upDown.z,
      );
      // Check if we can move in y direction
      this.translateDir(
        this.position,
        1,
        this.sideways.y + this.front.y + this.upDown.y,
      );
    } else {
      // stop the player in xz if in pause and don't allow jumping
      this.velocity = [0, 0, 0];
    }

    // Handle game boundaries
    this.checkBoundaries();
  }

  computeDeceleration() {
    this.velocity[0] += this.velocity[0] * DECELERATION[0] * this.delta;
    this.velocity[1] += this.velocity[1] * DECELERATION[1] * this.delta;
    this.velocity[2] += this.velocity[2] * DECELERATION[2] * this.delta;
  }

  speedGainCompute(
    sprint: boolean,
    right: boolean,
    forward: boolean,
    left: boolean,
    backward: boolean,
    isDesktop: boolean,
  ) {
    let addSpeedX;
    let addSpeedZ;

    this.sprintCompute(sprint);

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

    if (
      (right && forward) ||
      (left && forward) ||
      (right && backward) ||
      (left && backward)
    ) {
      addSpeedX = accelerationCorr[0] * deltaSprint;
      addSpeedZ = accelerationCorr[2] * deltaSprint;
    } else {
      addSpeedX = ACCELERATION[0] * deltaSprint;
      addSpeedZ = ACCELERATION[2] * deltaSprint;
    }
    this.velocity[0] += (rightF - leftF) * addSpeedX;
    this.velocity[2] += (backwardF - forwardF) * addSpeedZ;
  }

  private sprintCompute(sprint: boolean) {
    if (sprint) {
      this.sprintMult = Math.min(
        this.sprintMult + SPRINTGAIN * this.delta,
        SPRINTMAX,
      );
    } else {
      this.sprintMult = Math.max(
        this.sprintMult - SPRINTLOSS * this.delta,
        SPRINTMIN,
      );
    }
  }

  frontSideCompute(camera: THREE.Camera) {
    this.front.set(0, 0, 1).applyQuaternion(camera.quaternion);
    this.front.normalize().multiplyScalar(this.velocity[2] * this.delta);
    this.sideways
      .set(1, 0, 0)
      .applyQuaternion(camera.quaternion)
      .normalize()
      .multiplyScalar(this.velocity[0] * this.delta);

    this.upDown.set(0, 1, 0).applyQuaternion(camera.quaternion);
    this.upDown.normalize().multiplyScalar(this.velocity[1] * this.delta);
  }

  checkBoundaries() {
    if (this.position[0] <= WORLD_BOUNDARIES[0] + +this.hitBoxLow[0]) {
      this.position[0] = WORLD_BOUNDARIES[0] + this.hitBoxLow[0];
    } else if (this.position[0] >= WORLD_BOUNDARIES[1] - this.hitBoxHigh[0]) {
      this.position[0] = WORLD_BOUNDARIES[1] - this.hitBoxHigh[0];
    }
    if (this.position[1] <= WORLD_BOUNDARIES[2] + this.hitBoxLow[1]) {
      this.position[1] = WORLD_BOUNDARIES[2] + this.hitBoxLow[1];
    } else if (this.position[1] >= WORLD_BOUNDARIES[3] - this.hitBoxHigh[1]) {
      this.position[1] = WORLD_BOUNDARIES[3] - this.hitBoxHigh[1];
    }
    if (this.position[2] <= WORLD_BOUNDARIES[4] + this.hitBoxLow[2]) {
      this.position[2] = WORLD_BOUNDARIES[4] + this.hitBoxLow[2];
    } else if (this.position[2] >= WORLD_BOUNDARIES[5] - this.hitBoxHigh[2]) {
      this.position[2] = WORLD_BOUNDARIES[5] - this.hitBoxHigh[2];
    }
  }
}
export const CIMainViewer = new CMainViewer([0.3, 0.3, 0.3], [0.3, 0.3, 0.3]);
