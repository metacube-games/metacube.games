# tools

Offline asset-generation tools. Not part of the runtime.

| Tool | What it does |
|---|---|
| [`texture-tools/`](texture-tools/) | Generates cube texture atlases and dominant-color JSON from per-face source images. |
| [`solid-cubes-detector/`](solid-cubes-detector/) | React app that voxelizes a `.glb` mesh into cube positions. |

> The voxel meshing/lighting engine (C++ → WebAssembly) lives at [`game/wasm/`](../game/wasm/).
