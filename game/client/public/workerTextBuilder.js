"use strict";

const novaSquare = new FontFace(
  "Nova Square",
  "url(https://fonts.gstatic.com/s/novasquare/v24/RrQUbo9-9DV7b06QHgSWsahHT4I.woff2)"
);

// Messages that arrive before the font resolves are queued and flushed once.
let fontReady = false;
const pendingMessages = [];
novaSquare
  .load()
  .then((font) => self.fonts.add(font))
  .catch((err) =>
    console.error("Nova Square font failed to load; using fallback:", err)
  )
  .finally(() => {
    fontReady = true;
    while (pendingMessages.length > 0) renderName(pendingMessages.shift());
  });

const canvas = new OffscreenCanvas(0, 0);
const ctx = canvas.getContext("2d", {
  alpha: true,
  // Never read back for exact pixels, so desynchronized is safe.
  desynchronized: true,
});

const FONT = "90px Nova Square, sans-serif";
const STYLE = {
  miterLimit: 2,
  lineJoin: "round",
  lineWidth: 16,
  strokeStyle: "#121212bb",
  fillStyle: "whitesmoke",
  imageSmoothingEnabled: true,
};

const PADDING = 32;
const CANVAS_HEIGHT = 122;
const TEXT_Y = 90;
const TEXT_X = 16;
const SCALE_FACTOR = 0.0025;

let lastWidth = 0;
let lastHeight = 0;
let contextConfigured = false;

function configureContext() {
  ctx.miterLimit = STYLE.miterLimit;
  ctx.lineJoin = STYLE.lineJoin;
  ctx.lineWidth = STYLE.lineWidth;
  ctx.strokeStyle = STYLE.strokeStyle;
  ctx.fillStyle = STYLE.fillStyle;
  ctx.imageSmoothingEnabled = STYLE.imageSmoothingEnabled;
  ctx.font = FONT;
  contextConfigured = true;
}

function resizeCanvasIfNeeded(width, height) {
  if (width !== lastWidth || height !== lastHeight) {
    canvas.width = width;
    canvas.height = height;
    lastWidth = width;
    lastHeight = height;
    // Resizing resets the context; reconfiguration needed.
    contextConfigured = false;
    return true;
  }
  return false;
}

self.onmessage = ({ data }) => {
  if (!fontReady) {
    pendingMessages.push(data);
    return;
  }
  renderName(data);
};

function renderName({ name, id }) {
  if (!contextConfigured) {
    configureContext();
  }

  const textWidth = ctx.measureText(name).width;
  const requiredWidth = Math.ceil(textWidth) + PADDING;

  const didResize = resizeCanvasIfNeeded(requiredWidth, CANVAS_HEIGHT);

  if (didResize) {
    configureContext();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Stroke before fill for readable outline rendering.
  ctx.strokeText(name, TEXT_X, TEXT_Y);
  ctx.fillText(name, TEXT_X, TEXT_Y);

  createImageBitmap(canvas, {
    imageOrientation: "flipY",
    premultiplyAlpha: "none",
  })
    .then((img) => {
      postMessage(
        {
          texture: img,
          scaleXc: canvas.width * SCALE_FACTOR,
          scaleYc: canvas.height * SCALE_FACTOR,
          id,
        },
        [img]
      );
    })
    .catch((err) =>
      console.error("createImageBitmap failed for name texture:", err)
    );
}
