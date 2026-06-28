import { CState } from "../../helpers/CState";

class CMetacubeStates {
  public nbCubeLeft: CState<number> = new CState<number>("cubeLeft", 0);
  readonly totalNbCube: number = 16777216;
  currentLayer: number;
  layerInitialized = false;
  constructor() {
    this.currentLayer = 5;
  }
  public getCurrLayer() {
    return this.currentLayer;
  }

  public setCurrGameLayer(layer: number) {
    this.currentLayer = layer;
    this.layerInitialized = true;
  }

  public getNbCubeLeft() {
    return this.nbCubeLeft.val;
  }

  public sendEvent() {
    this.nbCubeLeft.sendEvent();
  }

  public setNbCubeLeft(nbCubeLeft: number) {
    this.nbCubeLeft.val = nbCubeLeft;
    this.nbCubeLeft.sendEvent();
  }

  public updateNbCubeLeft() {
    this.nbCubeLeft.val--;
    // Throttle UI updates: only broadcast every 100 destructions.
    if (this.nbCubeLeft.val % 100 === 0) {
      this.nbCubeLeft.sendEvent();
    }
  }

  public nbCubeRatio() {
    return this.nbCubeLeft.val / this.totalNbCube;
  }
  public nbCubePercentage() {
    return this.nbCubeRatio() * 100;
  }
}

export const CIMetacubeStates = new CMetacubeStates();
