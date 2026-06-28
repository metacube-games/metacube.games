"use strict";

/**
 * Collision worker: converts a triangle mesh (vertices/normals/indices) into
 * the set of solid voxel cells it covers, returned as "x,y,z" strings.
 */

/**
 * Pack 3 signed 16-bit coords into one JS-safe integer (offset by 32768).
 */
function encodeVoxel(x, y, z) {
  return ((x + 32768) * 4294967296) + ((y + 32768) * 65536) + (z + 32768);
}

function decodeVoxel(key) {
  const x = Math.floor(key / 4294967296) - 32768;
  const remainder = key % 4294967296;
  const y = Math.floor(remainder / 65536) - 32768;
  const z = (remainder % 65536) - 32768;
  return [x, y, z];
}

self.onmessage = (event) => {
  const { vertices, normals, indices, indicesCount } = event.data;
  const vertexArray = new Float32Array(vertices);
  const normalArray = new Float32Array(normals);
  const triangleCount = indicesCount / 3;
  const collisionSet = new Set();

  for (let i = 0; i < triangleCount; i++) {
    const baseIdx = i * 3;
    const v1Idx = indices[baseIdx] * 3;
    const v2Idx = indices[baseIdx + 1] * 3;
    const v3Idx = indices[baseIdx + 2] * 3;

    const v1x = vertexArray[v1Idx];
    const v1y = vertexArray[v1Idx + 1];
    const v1z = vertexArray[v1Idx + 2];
    const v2x = vertexArray[v2Idx];
    const v2y = vertexArray[v2Idx + 1];
    const v2z = vertexArray[v2Idx + 2];
    const v3x = vertexArray[v3Idx];
    const v3y = vertexArray[v3Idx + 1];
    const v3z = vertexArray[v3Idx + 2];

    const normalX = normalArray[v1Idx];
    const normalY = normalArray[v1Idx + 1];
    const normalZ = normalArray[v1Idx + 2];

    const absX = Math.abs(normalX);
    const absY = Math.abs(normalY);
    const absZ = Math.abs(normalZ);
    let m = 0;
    if (absY > absX) m = 1;
    if (absZ > Math.max(absX, absY)) m = 2;

    const axis1 = (m + 1) % 3;
    const axis2 = (m + 2) % 3;

    // Use the sign of the DOMINANT-axis normal component (not the sum of all
    // three) to decide the face offset. Identical for axis-aligned voxel normals,
    // correct in general.
    const dominantNormal = m === 0 ? normalX : m === 1 ? normalY : normalZ;
    const component = m === 0 ? v1x : m === 1 ? v1y : v1z;
    const dVal = Math.round(dominantNormal < 0 ? component : component - 1);

    let min1, max1, min2, max2;

    if (axis1 === 0) {
      min1 = Math.min(v1x, v2x, v3x);
      max1 = Math.max(v1x, v2x, v3x);
    } else if (axis1 === 1) {
      min1 = Math.min(v1y, v2y, v3y);
      max1 = Math.max(v1y, v2y, v3y);
    } else {
      min1 = Math.min(v1z, v2z, v3z);
      max1 = Math.max(v1z, v2z, v3z);
    }

    if (axis2 === 0) {
      min2 = Math.min(v1x, v2x, v3x);
      max2 = Math.max(v1x, v2x, v3x);
    } else if (axis2 === 1) {
      min2 = Math.min(v1y, v2y, v3y);
      max2 = Math.max(v1y, v2y, v3y);
    } else {
      min2 = Math.min(v1z, v2z, v3z);
      max2 = Math.max(v1z, v2z, v3z);
    }

    min1 = Math.round(min1);
    max1 = Math.round(max1);
    min2 = Math.round(min2);
    max2 = Math.round(max2);

    if (m === 0) {
      for (let a = min1; a < max1; a++) {
        for (let b = min2; b < max2; b++) {
          collisionSet.add(encodeVoxel(dVal, a, b));
        }
      }
    } else if (m === 1) {
      for (let a = min1; a < max1; a++) {
        for (let b = min2; b < max2; b++) {
          collisionSet.add(encodeVoxel(b, dVal, a));
        }
      }
    } else {
      for (let a = min1; a < max1; a++) {
        for (let b = min2; b < max2; b++) {
          collisionSet.add(encodeVoxel(a, b, dVal));
        }
      }
    }
  }

  const result = [];
  for (const key of collisionSet) {
    const [x, y, z] = decodeVoxel(key);
    result.push(`${x},${y},${z}`);
  }

  self.postMessage(result);
};
