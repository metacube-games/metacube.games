# solid-cubes-detector

React app that loads a `.glb` mesh and outputs the positions of every voxel cube inside its volume.

## Setup

```bash
npm install
npm start
```

Open <http://localhost:3000>.

## Usage

The `.glb` file path is hardcoded at line 4 of `src/GLBModel.js` — change the import there before running.

The app renders the mesh with triangle normals (blue arrows). Click **Download JSON** to export an array of cube positions.
