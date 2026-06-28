#!/usr/bin/env bash
# Compile the voxel meshing/lighting engine (C++ -> WebAssembly) with Emscripten,
# place a.out.wasm into ../client/public/, and splice the generated JS glue into
# ../client/public/worker.js between the <<<WASM_GLUE_BEGIN>>> / <<<WASM_GLUE_END>>>
# sentinels. Fully automated — no hand-pasting.
#
#   ./build.sh           build + write artifacts into ../client/public
#   ./build.sh --check   verify the committed artifacts are up to date (CI mode)
#
# Requires the Emscripten SDK pinned to the version in ./.emsdk-version, so the
# output is reproducible (byte-for-byte diffing in CI needs a pinned toolchain).
set -euo pipefail
cd "$(dirname "$0")"

CHECK=0
[[ "${1:-}" == "--check" ]] && CHECK=1

OUT_DIR="../client/public"
WORKER="$OUT_DIR/worker.js"
EXPECTED_VER="$(cat .emsdk-version 2>/dev/null || echo '')"

if ! command -v em++ >/dev/null 2>&1; then
  echo "error: em++ not found. Install/activate the Emscripten SDK (pinned: ${EXPECTED_VER:-see .emsdk-version})." >&2
  echo "       https://emscripten.org/docs/getting_started/downloads.html" >&2
  exit 1
fi
if [[ -n "$EXPECTED_VER" ]] && ! emcc --version | grep -qF "$EXPECTED_VER"; then
  echo "error: emcc version mismatch (need $EXPECTED_VER for reproducible output):" >&2
  emcc --version | head -1 >&2
  exit 1
fi

# Modern, STRICT-safe flag set that keeps the EXISTING worker.js working:
#   - Module.HEAP8/HEAP16/HEAP32/HEAPU8/HEAPU32/HEAPF32  -> EXPORTED_RUNTIME_METHODS
#   - Module._malloc / Module._free                      -> EXPORTED_FUNCTIONS
#   - the __Z* meshing entry points                      -> EMSCRIPTEN_KEEPALIVE in the C++
# Removed vs the legacy command: AGGRESSIVE_VARIABLE_ELIMINATION (removed from
# emscripten; hard-errors under STRICT) and INLINING_LIMIT=1 (fights -O3).
em++ \
  -O3 \
  -sWASM=1 \
  -sNO_EXIT_RUNTIME=1 \
  -sALLOW_MEMORY_GROWTH=1 \
  -sENVIRONMENT=worker \
  -sEXPORTED_FUNCTIONS='["_malloc","_free"]' \
  -sEXPORTED_RUNTIME_METHODS='["HEAP8","HEAPU8","HEAP16","HEAP32","HEAPU32","HEAPF32"]' \
  -o a.out.js \
  voxelWorldWasm.c++

# Splice the freshly generated glue into worker.js between the sentinels and
# place the wasm. In --check mode, fail instead of writing if anything differs.
WASM_CHECK="$CHECK" node --input-type=commonjs -e '
  const fs = require("fs");
  const [worker, wasmSrc, wasmDst] = process.argv.slice(1);
  const BEGIN = "// <<<WASM_GLUE_BEGIN";
  const END = "// <<<WASM_GLUE_END>>>";
  const check = process.env.WASM_CHECK === "1";
  const glue = fs.readFileSync("a.out.js", "utf8").trim();
  const src = fs.readFileSync(worker, "utf8");
  const b = src.indexOf(BEGIN), e = src.indexOf(END);
  if (b === -1 || e === -1 || e < b) {
    console.error("FATAL: WASM_GLUE sentinels not found in " + worker); process.exit(2);
  }
  const beginLineEnd = src.indexOf("\n", b);
  const head = src.slice(0, beginLineEnd + 1);
  const tail = src.slice(e);
  const nextWorker = head + glue + "\n" + tail;
  const stale =
    nextWorker !== src ||
    !fs.existsSync(wasmDst) ||
    Buffer.compare(fs.readFileSync(wasmSrc), fs.readFileSync(wasmDst)) !== 0;
  if (check) {
    if (stale) { console.error("STALE: run game/wasm/build.sh and commit game/client/public/{a.out.wasm,worker.js}"); process.exit(1); }
    console.log("wasm + glue are up to date.");
  } else {
    fs.writeFileSync(worker, nextWorker);
    fs.copyFileSync(wasmSrc, wasmDst);
    console.log("Built + spliced -> " + wasmDst + " and glue in " + worker);
  }
' "$WORKER" a.out.wasm "$OUT_DIR/a.out.wasm"

rm -f a.out.js a.out.wasm
