import * as THREE from "three";
import { colorBlackT1 } from "../../menu/styles/colors";

const CANVAS_DIMENSION = 200;
const DEVICE_REGEX = /iPhone|iPad|iPod/;

class CTextBuilder {
  private readonly lineWidth = 16;
  private readonly lineWidth2 = this.lineWidth * 2;
  private readonly textHeight = 90;
  private readonly canvasHeight = this.textHeight + this.lineWidth2;
  private readonly font = `${this.textHeight}px  Nova Square, sans-serif`;
  private readonly strokeColor = colorBlackT1;
  private readonly fillColor = "whitesmoke";
  private readonly scaleX = 0.0025;
  private readonly scaleY = 0.0025;
  private canvasType: HTMLCanvasElement | OffscreenCanvas | null = null;
  private context2D:
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null = null;
  public textGroup: THREE.Group | null = null;
  private worker: Worker | null = null;
  public createText = this.createTextWorker;

  constructor() {
    this.init();
  }

  private init() {
    if (this.shouldUseStandardCanvas()) {
      this.initStandardCanvas();
    } else {
      this.initOffscreenCanvas();
    }
  }

  private shouldUseStandardCanvas(): boolean {
    return (
      DEVICE_REGEX.test(navigator.userAgent) || !("OffscreenCanvas" in window)
    );
  }

  private initStandardCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_DIMENSION;
    canvas.height = CANVAS_DIMENSION;
    this.canvasType = canvas;
    this.context2D = canvas.getContext("2d");
    this.createText = this.createTextSTD;
  }

  private initOffscreenCanvas() {
    const canvasOffscreen = new OffscreenCanvas(
      CANVAS_DIMENSION,
      CANVAS_DIMENSION,
    );
    const ctx = canvasOffscreen.getContext("2d");
    if (!ctx) {
      this.initStandardCanvas();
      return;
    }
    this.canvasType = canvasOffscreen;
    this.context2D = ctx;
    this.initWorker();
  }

  private initWorker() {
    this.worker = new Worker("workerTextBuilder.js");
    this.worker.onmessage = this.handleWorkerMessage;
    this.worker.onerror = (err) => {
      console.error("Text builder worker error:", err.message);
    };
  }

  private handleWorkerMessage = (e: MessageEvent) => {
    const { texture, scaleXc, scaleYc, id } = e.data;
    const sprite = this.textGroup?.children[id] as THREE.Sprite | undefined;
    // The slot may have been recycled/removed before the async texture arrived;
    // drop the result instead of throwing on a missing sprite.
    if (!sprite) return;
    const threeTexture = new THREE.Texture(texture);
    threeTexture.needsUpdate = true;
    // Free the previous name texture before replacing it (avoids GPU memory churn).
    sprite.material.map?.dispose();
    sprite.material.map = threeTexture;
    sprite.scale.set(scaleXc, -scaleYc, scaleXc);
    sprite.visible = true;
  };

  private createTextSTD(name: string, currSprite: THREE.Sprite) {
    //id: number
    const canvas = this.canvasType;
    const ctx = this.context2D;
    if (!canvas || !ctx) {
      return;
    }
    ctx.font = this.font;
    ctx.lineWidth = this.lineWidth;
    canvas.width = ctx.measureText(name).width + this.lineWidth2;
    canvas.height = this.canvasHeight;

    ctx.miterLimit = 2;
    ctx.imageSmoothingEnabled = true;
    ctx.font = this.font;
    ctx.lineJoin = "round";
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.strokeColor;
    ctx.fillStyle = this.fillColor;

    ctx.strokeText(name, this.lineWidth, this.textHeight);
    ctx.fillText(name, this.lineWidth, this.textHeight);

    const scaleXc = this.scaleX * canvas.width;
    const scaleYc = this.scaleY * canvas.height;
    const texture = new THREE.CanvasTexture(canvas);

    currSprite.material.map = texture;
    currSprite.name = name;
    currSprite.scale.set(scaleXc, scaleYc, scaleXc);
  }

  private createTextWorker(name: string, currSprite: THREE.Sprite, id: number) {
    currSprite.name = name;
    this.worker?.postMessage({ name, id });
  }
}

export const CITextBuilder = new CTextBuilder();
