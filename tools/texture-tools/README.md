# texture-tools

Generates cube texture atlases and dominant-color JSON from per-face source images.

```bash
python run_all.py
```

## Image folder layout

Each cube lives under `images/NNN_name/` with one subdirectory per map type (`color`, `metalness`, `roughness`, `light`). Inside each map directory, faces are numbered starting at `0.png`:

- `0.png` — all faces identical
- `0.png` + `1.png` — side faces / top+bottom
- `0.png` + `1.png` + `2.png` — side / top / bottom

## Scripts

| Script | Output |
|---|---|
| `textureCreator.py` | `textures/*.png` — one atlas per map type |
| `texturePaddedCreator.py` | `textures/padded/*.png` — same atlases with 1-px border padding |
| `dominantColorsWriter.py` | `voxelsJson/colorArray.json` — dominant colors per cube from the color atlas |
| `offensivePixels.py` | `voxelsJson/offensiveCoor.json` — lit pixel coordinates per cube from the light atlas |
