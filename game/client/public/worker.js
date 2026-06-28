"use strict";

let ModuleInitialized = false;
// Messages that arrive before WASM is ready are queued here (array so all are
// replayed, not just the last) and flushed by onRuntimeInitialized.
let pendingInits = [];
// Pre-initialise as an object so the emscripten glue adopts THIS instance;
// hand-written handlers then see the runtime exports on Module.HEAP*/_malloc/__Z*.
// locateFile propagates the worker's own ?v= version stamp to a.out.wasm so
// both assets are cache-busted together on each deploy.
// Must be var (not let/const): the unminified emscripten glue also declares
// `var Module` at module top-level; two var declarations for the same name are
// legal (they share one binding), but let + var in the same scope is a SyntaxError.
const _workerV = new URLSearchParams(self.location.search).get("v") ?? ""; // eslint-disable-line no-var
var Module = { // eslint-disable-line no-var
  locateFile: (path) => (_workerV ? `${path}?v=${_workerV}` : path),
};

const bytesInInt16 = 2;
const tileSize = 32;
const tileTextureWidth = 1428;
const tileTextureHeight = 136;
let cellSize = null;

function updateGeometry(event) {
  const { cellID, voxelsToDestroy } = event.data;

  const flattenedVoxels = new Uint8Array(voxelsToDestroy);
  const length = flattenedVoxels.length || 0;
  const ptr = Module._malloc(length);

  // resultPtr points into the persistent voxelWorld object — do NOT free it.
  try {
    Module.HEAPU8.set(flattenedVoxels, ptr);

    const resultPtr = Module.__Z14updateGeometryPhii(ptr, length, cellID);
    const data = new Int32Array(Module.HEAP32.buffer, resultPtr, 16);

    const [
      positionsLength,
      positionsPtr,
      normalsLength,
      normalsPtr,
      uvsLength,
      uvsPtr,
      indicesLength,
      indicesPtr,
      colorsLength,
      colorsPtr,
      lightPositionsLength,
      lightPositionsPtr,
      lightRGBLength,
      lightRGBPtr,
      lightPositionsCellLength,
      lightPositionsCellPtr,
    ] = data;

    const positions = new Int8Array(
      Module.HEAP8.buffer,
      positionsPtr,
      positionsLength
    ).slice().buffer;
    const normals = new Int8Array(
      Module.HEAP8.buffer,
      normalsPtr,
      normalsLength
    ).slice().buffer;
    const uvs = new Float32Array(Module.HEAPF32.buffer, uvsPtr, uvsLength).slice()
      .buffer;
    const indices = new Uint32Array(
      Module.HEAPU32.buffer,
      indicesPtr,
      indicesLength
    ).slice().buffer;
    const colors = new Float32Array(
      Module.HEAPF32.buffer,
      colorsPtr,
      colorsLength
    ).slice().buffer;
    const lightPositions = new Int32Array(
      Module.HEAP32.buffer,
      lightPositionsPtr,
      lightPositionsLength
    ).slice().buffer;
    const lightRGB = new Int8Array(
      Module.HEAP8.buffer,
      lightRGBPtr,
      lightRGBLength
    ).slice().buffer;
    const lightPositionsCell = new Int16Array(
      Module.HEAP16.buffer,
      lightPositionsCellPtr,
      lightPositionsCellLength
    ).slice().buffer;

    self.postMessage(
      {
        positions,
        normals,
        uvs,
        indices,
        colors,
        lightPositions,
        lightRGB,
        lightPositionsCell,
        cellID,
        event: "updated",
      },
      [
        positions,
        normals,
        uvs,
        indices,
        colors,
        lightPositions,
        lightRGB,
        lightPositionsCell,
      ]
    );
  } finally {
    Module._free(ptr);
  }
}

function updateLight(event) {
  const { cellID, voxelsToDestroy, lightCellToUpdate } = event.data;

  const voxelsFlat = new Uint8Array(voxelsToDestroy);
  const voxelsLength = voxelsFlat.length || 0;

  const lightCellsTyped = new Int16Array(lightCellToUpdate);
  const lightCellsLength = lightCellsTyped.length || 0;

  const voxelsPtr = Module._malloc(voxelsLength);
  Module.HEAPU8.set(voxelsFlat, voxelsPtr);

  const lightCellsPtr = Module._malloc(bytesInInt16 * lightCellsLength);
  Module.HEAP16.set(lightCellsTyped, lightCellsPtr / bytesInInt16);

  const resultPtr = Module.__Z11updateLightPhiiPss(
    voxelsPtr,
    voxelsLength,
    cellID,
    lightCellsPtr,
    lightCellsLength
  );
  const data = new Int32Array(Module.HEAP32.buffer, resultPtr, 8);

  const colors = new Float32Array(
    Module.HEAPF32.buffer,
    data[1],
    data[0]
  ).slice().buffer;
  const lightPositions = new Int32Array(
    Module.HEAP32.buffer,
    data[3],
    data[2]
  ).slice().buffer;
  const lightRGB = new Int8Array(Module.HEAP8.buffer, data[5], data[4]).slice()
    .buffer;
  const lightPositionsCell = new Int16Array(
    Module.HEAP16.buffer,
    data[7],
    data[6]
  ).slice().buffer;

  self.postMessage(
    {
      colors,
      cellID,
      event: "updateLight",
      lightPositions,
      lightRGB,
      lightPositionsCell,
    },
    [colors, lightPositions, lightRGB, lightPositionsCell]
  );

  // resultPtr points into the persistent voxelWorld object — do NOT free it.
  Module._free(voxelsPtr);
  Module._free(lightCellsPtr);
}

function initWorker(event) {
  const { sizes, geometry, currLayer } = event.data;
  const ptr = Module._malloc(geometry.length);

  Module.HEAP8.set(geometry, ptr);

  // Set the active layer before init: initWorker() runs initializeWorldLight(),
  // which reads currLayer to size the light field.
  Module.__Z11updateLayeri(currLayer);
  Module.__Z10initWorkeriiiiiiiPa(
    sizes[0],
    sizes[1],
    sizes[2],
    cellSize,
    tileSize,
    tileTextureWidth,
    tileTextureHeight,
    ptr
  );

  self.postMessage({ event: "done" });
  Module._free(ptr);
}

function initWorldGeo(event) {
  const { sizes, geometry, currLayer } = event.data;
  const ptr = Module._malloc(geometry.length);

  Module.HEAP8.set(geometry, ptr);

  // Set the active layer before init: initializeVoxelWorld() runs
  // initializeWorldLight(), which reads currLayer to size the light field.
  Module.__Z11updateLayeri(currLayer);
  const resultPtr = Module.__Z20initializeVoxelWorldiiiiiiiPh(
    sizes[0],
    sizes[1],
    sizes[2],
    cellSize,
    tileSize,
    tileTextureWidth,
    tileTextureHeight,
    ptr
  );

  const lightsDataPtr = Module.__Z13getLightsDatav();
  const totalSize = sizes[0] * sizes[1] * sizes[2];

  const fullArray = new Int8Array(
    Module.HEAP8.buffer,
    resultPtr,
    totalSize
  ).slice().buffer;
  const lights = new Int8Array(
    Module.HEAP8.buffer,
    lightsDataPtr,
    totalSize * 4
  ).slice().buffer;
  const cells = new Int8Array(totalSize / cellSize ** 3).fill(1).buffer;

  const syncVoxels = new Uint8Array(Math.ceil(totalSize / 8));
  for (let i = 0; i < totalSize; i++) {
    if (Module.HEAP8[resultPtr + i] !== 0) {
      syncVoxels[i >> 3] |= 1 << (i & 7);
    }
  }

  self.postMessage(
    {
      event: "initWorkers",
      fullArray,
      sizes,
      cells,
      lights,
      syncVoxels: syncVoxels.buffer,
    },
    [fullArray, cells, lights, syncVoxels.buffer]
  );

  Module._free(ptr);
}

self.onmessage = (event) => {
  const handlers = {
    updateCell: updateGeometry,
    updateLight: updateLight,
    initWorker: (e) => {
      cellSize = e.data.cellSize;
      if (ModuleInitialized) initWorker(e);
      else pendingInits.push(() => initWorker(e));
    },
    initWorldGeometry: (e) => {
      cellSize = e.data.cellSize;
      if (ModuleInitialized) initWorldGeo(e);
      else pendingInits.push(() => initWorldGeo(e));
    },
    changeLayer: (e) => {
      Module.__Z11updateLayeri(e.data.layer);
      self.postMessage({ event: "done" });
    },
  };

  const handler = handlers[event.data.event];
  if (handler) handler(event);
};

// <<<WASM_GLUE_BEGIN — generated by wasm/build.sh from a.out.js; do not edit by hand>>>
var Module=typeof Module!="undefined"?Module:{};var ENVIRONMENT_IS_WEB=false;var ENVIRONMENT_IS_WORKER=true;var programArgs=[];var thisProgram="./this.program";var _scriptName;if(ENVIRONMENT_IS_WORKER){_scriptName=self.location.href}var scriptDirectory="";function locateFile(path){if(Module["locateFile"]){return Module["locateFile"](path,scriptDirectory)}return scriptDirectory+path}var readAsync,readBinary;if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){try{scriptDirectory=new URL(".",_scriptName).href}catch{}{if(ENVIRONMENT_IS_WORKER){readBinary=url=>{var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.responseType="arraybuffer";xhr.send(null);return new Uint8Array(xhr.response)}}readAsync=async url=>{var response=await fetch(url,{credentials:"same-origin"});if(response.ok){return response.arrayBuffer()}throw new Error(response.status+" : "+response.url)}}}else{}var out=console.log.bind(console);var err=console.error.bind(console);var wasmBinary;var ABORT=false;class EmscriptenEH{}class EmscriptenSjLj extends EmscriptenEH{}var runtimeInitialized=false;function updateMemoryViews(){var b=wasmMemory.buffer;Module["HEAP8"]=HEAP8=new Int8Array(b);Module["HEAP16"]=HEAP16=new Int16Array(b);Module["HEAPU8"]=HEAPU8=new Uint8Array(b);HEAPU16=new Uint16Array(b);Module["HEAP32"]=HEAP32=new Int32Array(b);Module["HEAPU32"]=HEAPU32=new Uint32Array(b);Module["HEAPF32"]=HEAPF32=new Float32Array(b);HEAPF64=new Float64Array(b);HEAP64=new BigInt64Array(b);HEAPU64=new BigUint64Array(b)}function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(onPreRuns)}function initRuntime(){runtimeInitialized=true;wasmExports["e"]()}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(onPostRuns)}function abort(what){Module["onAbort"]?.(what);what=`Aborted(${what})`;err(what);ABORT=true;what+=". Build with -sASSERTIONS for more info.";var e=new WebAssembly.RuntimeError(what);throw e}var wasmBinaryFile;function findWasmBinary(){return locateFile("a.out.wasm")}function getBinarySync(file){if(file==wasmBinaryFile&&wasmBinary){return new Uint8Array(wasmBinary)}if(readBinary){return readBinary(file)}throw"both async and sync fetching of the wasm failed"}async function getWasmBinary(binaryFile){if(!wasmBinary){try{var response=await readAsync(binaryFile);return new Uint8Array(response)}catch{}}return getBinarySync(binaryFile)}async function instantiateArrayBuffer(binaryFile,imports){try{var binary=await getWasmBinary(binaryFile);var instance=await WebAssembly.instantiate(binary,imports);return instance}catch(reason){err(`failed to asynchronously prepare wasm: ${reason}`);abort(reason)}}async function instantiateAsync(binary,binaryFile,imports){if(!binary){try{var response=fetch(binaryFile,{credentials:"same-origin"});var instantiationResult=await WebAssembly.instantiateStreaming(response,imports);return instantiationResult}catch(reason){err(`wasm streaming compile failed: ${reason}`);err("falling back to ArrayBuffer instantiation")}}return instantiateArrayBuffer(binaryFile,imports)}function getWasmImports(){var imports={a:wasmImports};return imports}async function createWasm(){function receiveInstance(instance,module){wasmExports=instance.exports;assignWasmExports(wasmExports);updateMemoryViews();return wasmExports}function receiveInstantiationResult(result){return receiveInstance(result["instance"])}var info=getWasmImports();if(Module["instantiateWasm"]){return new Promise((resolve,reject)=>{Module["instantiateWasm"](info,(inst,mod)=>{resolve(receiveInstance(inst,mod))})})}wasmBinaryFile??=findWasmBinary();var result=await instantiateAsync(wasmBinary,wasmBinaryFile,info);var exports=receiveInstantiationResult(result);return exports}class ExitStatus{name="ExitStatus";constructor(status){this.message=`Program terminated with exit(${status})`;this.status=status}}var HEAP16;var HEAP32;var HEAP64;var HEAP8;var HEAPF32;var HEAPF64;var HEAPU16;var HEAPU32;var HEAPU64;var HEAPU8;var callRuntimeCallbacks=callbacks=>{while(callbacks.length>0){callbacks.shift()(Module)}};var onPostRuns=[];var addOnPostRun=cb=>onPostRuns.push(cb);var onPreRuns=[];var addOnPreRun=cb=>onPreRuns.push(cb);var noExitRuntime=true;class ExceptionInfo{constructor(excPtr){this.excPtr=excPtr;this.ptr=excPtr-24}set_type(type){HEAPU32[this.ptr+4>>2]=type}get_type(){return HEAPU32[this.ptr+4>>2]}set_destructor(destructor){HEAPU32[this.ptr+8>>2]=destructor}get_destructor(){return HEAPU32[this.ptr+8>>2]}set_caught(caught){caught=caught?1:0;HEAP8[this.ptr+12]=caught}get_caught(){return HEAP8[this.ptr+12]!=0}set_rethrown(rethrown){rethrown=rethrown?1:0;HEAP8[this.ptr+13]=rethrown}get_rethrown(){return HEAP8[this.ptr+13]!=0}init(type,destructor){this.set_adjusted_ptr(0);this.set_type(type);this.set_destructor(destructor)}set_adjusted_ptr(adjustedPtr){HEAPU32[this.ptr+16>>2]=adjustedPtr}get_adjusted_ptr(){return HEAPU32[this.ptr+16>>2]}}var uncaughtExceptionCount=0;var ___cxa_throw=(ptr,type,destructor)=>{var info=new ExceptionInfo(ptr);info.init(type,destructor);uncaughtExceptionCount++;abort()};var __abort_js=()=>abort("");var getHeapMax=()=>2147483648;var alignMemory=(size,alignment)=>Math.ceil(size/alignment)*alignment;var growMemory=size=>{var oldHeapSize=wasmMemory.buffer.byteLength;var pages=(size-oldHeapSize+65535)/65536|0;try{wasmMemory.grow(pages);updateMemoryViews();return 1}catch(e){}};var _emscripten_resize_heap=requestedSize=>{var oldSize=HEAPU8.length;requestedSize>>>=0;var maxHeapSize=getHeapMax();if(requestedSize>maxHeapSize){return false}for(var cutDown=1;cutDown<=4;cutDown*=2){var overGrownHeapSize=oldSize*(1+.2/cutDown);overGrownHeapSize=Math.min(overGrownHeapSize,requestedSize+100663296);var newSize=Math.min(maxHeapSize,alignMemory(Math.max(requestedSize,overGrownHeapSize),65536));var replacement=growMemory(newSize);if(replacement){return true}}return false};{if(Module["noExitRuntime"])noExitRuntime=Module["noExitRuntime"];if(Module["print"])out=Module["print"];if(Module["printErr"])err=Module["printErr"];if(Module["wasmBinary"])wasmBinary=Module["wasmBinary"];if(Module["arguments"])programArgs=Module["arguments"];if(Module["thisProgram"])thisProgram=Module["thisProgram"];if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].shift()()}}}var __Z14updateGeometryPhii,__Z11updateLightPhiiPss,__Z20initializeVoxelWorldiiiiiiiPh,_free,_malloc,__Z10initWorkeriiiiiiiPa,__Z11updateLayeri,__Z13getLightsDatav,memory,_voxelWorld,__indirect_function_table,wasmMemory;function assignWasmExports(wasmExports){__Z14updateGeometryPhii=Module["__Z14updateGeometryPhii"]=wasmExports["g"];__Z11updateLightPhiiPss=Module["__Z11updateLightPhiiPss"]=wasmExports["h"];__Z20initializeVoxelWorldiiiiiiiPh=Module["__Z20initializeVoxelWorldiiiiiiiPh"]=wasmExports["i"];_free=Module["_free"]=wasmExports["j"];_malloc=Module["_malloc"]=wasmExports["k"];__Z10initWorkeriiiiiiiPa=Module["__Z10initWorkeriiiiiiiPa"]=wasmExports["l"];__Z11updateLayeri=Module["__Z11updateLayeri"]=wasmExports["m"];__Z13getLightsDatav=Module["__Z13getLightsDatav"]=wasmExports["n"];memory=wasmMemory=wasmExports["d"];_voxelWorld=Module["_voxelWorld"]=wasmExports["f"].value;__indirect_function_table=wasmExports["__indirect_function_table"]}var wasmImports={a:___cxa_throw,b:__abort_js,c:_emscripten_resize_heap};async function run(){preRun();var setStatus=Module["setStatus"];if(setStatus){setStatus("Running...");await new Promise(resolve=>setTimeout(resolve,1));setTimeout(setStatus,1,"")}if(ABORT)return;initRuntime();Module["onRuntimeInitialized"]?.();postRun()}var wasmExports;createWasm().then(()=>run());
// <<<WASM_GLUE_END>>>

// Hand-written (NOT regenerated by build.sh): assigned after the glue so it
// wins over emscripten's default onRuntimeInitialized.
Module.onRuntimeInitialized = () => {
  ModuleInitialized = true;
  const runs = pendingInits.splice(0);
  runs.forEach((run) => run());
};
