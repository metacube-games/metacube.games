import dotenv from "dotenv";
import { createRequire } from "module";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { Redis } from "ioredis";
import fs from "fs/promises";
import { existsSync, readFileSync } from "fs";
import { Buffer } from "buffer";
import os from "os";
import * as Jimp2 from "jimp";
import path from "path";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Then load the JSON file manually: await fs.readFile(path.join(__dirname, "data/cubeIndexMap.json"))
const rawData = await fs.readFile(
  path.join(__dirname, "data/cubeIndexMap.json"),
  "utf-8"
);
const nftsPerVoxelType = JSON.parse(rawData);
const require = createRequire(import.meta.url);
const { Jimp } = require("jimp");
const voxelTypes = require("./data/voxelData.json");
dotenv.config({ path: "/env/.env" });

/**
 * Constants and configurations
 */
const cubeSize = 256;
const biomeSize = 16;
const biomesPerLine = cubeSize / biomeSize;
const numberOfNFTs = 2000;

// Ranges defining each layer in the cube
const layersRanges = [
  [16, 240],
  [32, 224],
  [48, 192],
  [80, 160],
  [112, 32],
];

// const layersRanges = [
//   [0, 32],
//   [32, 64],
//   [64, 96],
//   [96, 128],
// ];
const numberOfLayers = layersRanges.length;
// Probability to switch biome in fade zones
const switchProbabilityPerFadeLayer: number[] = [0.2, 0.1];
const fadeSize = switchProbabilityPerFadeLayer.length;

// Voxel types and their probabilities for each biome
const biomesVoxels: {
  [key: number]: { types: number[]; probabilities: number[] };
} = {
  0: { types: [1, 2, 3], probabilities: [0.02, 0.7, 0.28] },
  1: { types: [4, 5, 6], probabilities: [0.02, 0.7, 0.28] },
  2: { types: [7, 8, 9], probabilities: [0.02, 0.7, 0.28] },
  3: { types: [10, 11, 12], probabilities: [0.02, 0.7, 0.28] },
  4: { types: [13, 14, 15], probabilities: [0.02, 0.7, 0.28] },
  5: { types: [16, 17, 18], probabilities: [0.02, 0.7, 0.28] },
  6: { types: [19, 20, 21], probabilities: [0.02, 0.7, 0.28] },
  7: { types: [22, 23, 24], probabilities: [0.02, 0.7, 0.28] },
  8: { types: [25, 26, 27], probabilities: [0.02, 0.7, 0.28] },
  9: { types: [28, 29, 30], probabilities: [0.02, 0.7, 0.28] },
  10: { types: [31, 32, 33], probabilities: [0.02, 0.7, 0.28] },
  11: { types: [34, 35, 36], probabilities: [0.02, 0.7, 0.28] },
  12: { types: [37, 38, 39], probabilities: [0.02, 0.7, 0.28] },
  13: {
    types: [
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
    ],
    probabilities: [
      0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025,
      0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025,
      0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.025,
      0.025, 0.025, 0.025, 0.025, 0.025, 0.025, 0.03, 0.035, 0.035,
    ],
  },
  14: { types: [40, 41, 42], probabilities: [0.02, 0.7, 0.28] },
};
const numberOfBiomes = Object.keys(biomesVoxels).length; // Total number of different biomes
// Probability distribution of biomes per layer
const biomesProbabilityPerLayer: number[][] = [
  // [0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  // [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // [0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
  // [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
  // [0,0,0,1,0,0,0,0,0,0,0,0,0,0,0],
  // [0,0,0,0,1,0,0,0,0,0,0,0,0,0,0],
  [1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 1 / 6, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 1 / 8, 0, 0, 0, 0, 0, 0, 0],
  [
    1 / 10,
    1 / 10,
    1 / 10,
    1 / 10,
    1 / 10,
    1 / 10,
    1 / 10,
    1 / 10,
    1 / 10,
    1 / 10,
    0,
    0,
    0,
    0,
    0,
  ],
  [
    1 / 12,
    1 / 12,
    1 / 12,
    1 / 12,
    1 / 12,
    1 / 12,
    1 / 12,
    1 / 12,
    1 / 12,
    1 / 12,
    1 / 12,
    1 / 12,
    0,
    0,
    0,
  ],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
];

// check that sum of probabilities is 1
for (const layer in biomesProbabilityPerLayer) {
  if (
    Math.abs(biomesProbabilityPerLayer[layer].reduce((a, b) => a + b, 0) - 1) >
    0.0001
  ) {
    throw new Error(`Probabilities for layer ${layer} do not sum to 1`);
  }
}
// check that sum of probabilities is 1
for (const biome in biomesVoxels) {
  const { probabilities } = biomesVoxels[biome];
  const aa = Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1);
  if (aa > 0.0001) {
    throw new Error(`Probabilities for biome ${biome} do not sum to 1 ${aa}`);
  }
}
// Helper function to create a range of numbers
const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start }, (_, i) => start + i);

/**
 * Determines the layer of the cube based on coordinates
 */
function getLayer(x: number, y: number, z: number): number {
  // const coordinates = [x, y, z];
  const corrXY = [x, z];
  for (let i = 0; i < numberOfLayers; i++) {
    const [minRange, maxRange] = layersRanges[i];
    if (
      corrXY.some(
        (coord) => coord < minRange || coord >= cubeSize - minRange
      ) ||
      y >= maxRange
    ) {
      return i;
    }
  }
  return numberOfLayers; // Default to the last layer
}

/**
 * Interface representing the fade zone information
 */
interface FadeZoneInfo {
  isInFadeZone: boolean;
  shifts: { x: number; y: number; z: number };
  distance: number;
}

/**
 * Checks if a voxel is in a fade zone between biomes
 */
function isInFadeZone(x: number, y: number, z: number): FadeZoneInfo {
  const inFade = (coord: number) =>
    coord % biomeSize < fadeSize || coord % biomeSize >= biomeSize - fadeSize;
  const xInFade = inFade(x);
  const yInFade = inFade(y);
  const zInFade = inFade(z);
  const isInFadeZone = xInFade || yInFade || zInFade;

  if (isInFadeZone) {
    const shifts = {
      x: xInFade ? (x % biomeSize < fadeSize ? -1 : 1) : 0,
      y: yInFade ? (y % biomeSize < fadeSize ? -1 : 1) : 0,
      z: zInFade ? (z % biomeSize < fadeSize ? -1 : 1) : 0,
    };

    const distance = Math.min(
      x % biomeSize,
      y % biomeSize,
      z % biomeSize,
      biomeSize - (x % biomeSize) - 1,
      biomeSize - (y % biomeSize) - 1,
      biomeSize - (z % biomeSize) - 1
    );

    return { isInFadeZone, shifts, distance };
  }
  return { isInFadeZone: false, shifts: { x: 0, y: 0, z: 0 }, distance: 0 };
}

/**
 * Retrieves neighboring biomes for a voxel in a fade zone
 */
function getNeighborBiomes(
  x: number,
  y: number,
  z: number,
  biomes: number[][][],
  voxelInfo: FadeZoneInfo
): number[] {
  const neighborBiomes = new Set<number>();
  const biomeX = Math.floor(x / biomeSize);
  const biomeY = Math.floor(y / biomeSize);
  const biomeZ = Math.floor(z / biomeSize);

  const shifts = voxelInfo.shifts;

  // Add neighbor biomes based on shifts
  for (const [dx, dy, dz] of [
    [shifts.x, 0, 0],
    [0, shifts.y, 0],
    [0, 0, shifts.z],
    [shifts.x, shifts.y, 0],
    [shifts.x, 0, shifts.z],
    [0, shifts.y, shifts.z],
    [shifts.x, shifts.y, shifts.z],
  ]) {
    if (dx || dy || dz) {
      const nx = biomeX + dx;
      const ny = biomeY + dy;
      const nz = biomeZ + dz;
      if (
        nx >= 0 &&
        ny >= 0 &&
        nz >= 0 &&
        nx < biomesPerLine &&
        ny < biomesPerLine &&
        nz < biomesPerLine
      ) {
        neighborBiomes.add(biomes[nx][ny][nz]);
      }
    }
  }

  return Array.from(neighborBiomes);
}

/**
 * Selects a random value based on provided probabilities
 */
function chooseRandomValue<T>(values: T[], probabilities: number[]): T {
  const random = Math.random();
  let cumulativeSum = 0;
  for (let i = 0; i < values.length; i++) {
    cumulativeSum += probabilities[i];
    if (random < cumulativeSum) {
      return values[i];
    }
  }
  return values[values.length - 1]; // Fallback to last value
}

/**
 * Generates the initial cube with biomes and voxels
 */
function generateCube() {
  // Initialize biomes array
  const biomes = Array.from({ length: biomesPerLine }, () =>
    Array.from({ length: biomesPerLine }, () =>
      Array.from({ length: biomesPerLine }, () => 0)
    )
  );

  // Assign biomes to each biome cell
  for (let i = 0; i < biomesPerLine; i++) {
    for (let j = 0; j < biomesPerLine; j++) {
      for (let k = 0; k < biomesPerLine; k++) {
        const layer = getLayer(i * biomeSize, j * biomeSize, k * biomeSize);
        biomes[i][j][k] = chooseRandomValue(
          range(0, numberOfBiomes),
          biomesProbabilityPerLayer[layer]
        );
      }
    }
  }

  // Initialize voxels array and buffer
  const voxelsTypesBuffer = Buffer.alloc(cubeSize * cubeSize * cubeSize);

  // Assign voxel types to each voxel
  for (let x = 0; x < cubeSize; x++) {
    for (let y = 0; y < cubeSize; y++) {
      for (let z = 0; z < cubeSize; z++) {
        const voxelInfo = isInFadeZone(x, y, z);
        let biome: number;

        if (
          voxelInfo.isInFadeZone &&
          Math.random() <
            (switchProbabilityPerFadeLayer[voxelInfo.distance] ?? 0.1)
        ) {
          const neighborBiomes = getNeighborBiomes(x, y, z, biomes, voxelInfo);
          biome =
            neighborBiomes[Math.floor(Math.random() * neighborBiomes.length)];
        } else {
          biome =
            biomes[Math.floor(x / biomeSize)][Math.floor(y / biomeSize)][
              Math.floor(z / biomeSize)
            ];
        }

        const { types, probabilities } = biomesVoxels[biome ?? 0];
        const voxelType = chooseRandomValue(types, probabilities);
        const index = x + y * cubeSize + z * cubeSize * cubeSize;
        voxelsTypesBuffer[index] = voxelType;
      }
    }
  }

  return { voxelsTypesBuffer };
}

/**
 * Overlays an image onto the cube (applies a logo or pattern)
 */
async function overlayImageOnCube(
  buffer: number[] | Buffer,
  image: {
    getPixelColor: (arg0: number, arg1: number) => any;
    bitmap: { width: number; height: number };
  }
) {
  const cubeSize2 = cubeSize * cubeSize;

  // Overlay on Front and Back faces
  for (let x of [0, cubeSize - 1]) {
    for (let z = 0; z < cubeSize; z++) {
      for (let y = 0; y < cubeSize; y++) {
        const color = Jimp2.intToRGBA(
          image.getPixelColor(z % image.bitmap.width, y % image.bitmap.height)
        );
        const voxelType =
          color.r === 0 && color.g === 0 && color.b === 0 ? 42 : 41;

        const xi = x;
        const yi = cubeSize - 1 - y;
        const zi = cubeSize - 1 - z;

        const voxelIndex = xi + yi * cubeSize + zi * cubeSize2;

        buffer[voxelIndex] = voxelType;
      }
    }
  }

  // Overlay on Top face
  const y = cubeSize - 1;
  for (let x = 0; x < cubeSize; x++) {
    for (let z = 0; z < cubeSize; z++) {
      const color = Jimp2.intToRGBA(
        image.getPixelColor(x % image.bitmap.width, z % image.bitmap.height)
      );
      const voxelType =
        color.r === 0 && color.g === 0 && color.b === 0 ? 42 : 41;

      const xi = x;
      const yi = y;
      const zi = cubeSize - 1 - z;

      const voxelIndex = xi + yi * cubeSize + zi * cubeSize2;
      buffer[voxelIndex] = voxelType;
    }
  }

  // Overlay on Left and Right faces
  for (let z of [0, cubeSize - 1]) {
    for (let x = 0; x < cubeSize; x++) {
      for (let y = 0; y < cubeSize; y++) {
        const color = Jimp2.intToRGBA(
          image.getPixelColor(x % image.bitmap.width, y % image.bitmap.height)
        );
        const voxelType =
          color.r === 0 && color.g === 0 && color.b === 0 ? 42 : 41;

        const xi = cubeSize - 1 - x;
        const yi = cubeSize - 1 - y;
        const zi = z;

        const voxelIndex = xi + yi * cubeSize + zi * cubeSize2;
        buffer[voxelIndex] = voxelType;
      }
    }
  }
}

const CubePerIndexMap: any = [];
// function indexToPosition(index: number): [number, number, number] {
//   const x = Math.floor(index / (cubeSize * cubeSize));
//   const y = Math.floor((index % (cubeSize * cubeSize)) / cubeSize);
//   const z = index % cubeSize;
//   return [x, y, z];
// }

function placeNFTs(voxelsTypesBuffer: Buffer): Map<string, number> {
  CubePerIndexMap[0] = [];

  for (let x = 0; x < cubeSize; x++) {
    for (let y = 0; y < cubeSize; y++) {
      for (let z = 0; z < cubeSize; z++) {
        const index = x + y * cubeSize + z * cubeSize * cubeSize;
        const voxelType = voxelsTypesBuffer[index];
        if (!CubePerIndexMap[voxelType]) CubePerIndexMap[voxelType] = [];
        CubePerIndexMap[voxelType].push([x, y, z]);
      }
    }
  }

  // for (
  //   let indexBuffer = 0;
  //   indexBuffer < voxelsTypesBuffer.length;
  //   indexBuffer++
  // ) {
  //   const voxelType = voxelsTypesBuffer[indexBuffer];
  //   const pos = indexToPosition(indexBuffer);

  //   if (!CubePerIndexMap[voxelType]) CubePerIndexMap[voxelType] = [];
  //   CubePerIndexMap[voxelType].push(pos);
  // }

  const data = new Map<string, number>();
  const usedPositions = new Set<string>();
  for (const voxelTypeStr of Object.keys(CubePerIndexMap)) {
    // console.log(voxelTypeStr);
    const voxelType = Number(voxelTypeStr);
    const positions = CubePerIndexMap[voxelType];
    if (positions.length === 0) {
      console.warn("No positions for this voxelType, skip", voxelType);
      continue;
    }
    const nftIndices =
      nftsPerVoxelType[voxelType as unknown as keyof typeof nftsPerVoxelType] ||
      [];

    for (const nftIndex of nftIndices) {
      while (true) {
        const randIndex = Math.floor(Math.random() * positions.length);
        const [x, y, z] = positions[randIndex];
        const key = `${x}:${y}:${z}`;
        // const voxelIndex = x + y * cubeSize + z * cubeSize * cubeSize;

        if (!usedPositions.has(`${key}-${voxelType}`)) {
          usedPositions.add(`${key}-${voxelType}`);
          // voxelIndex;voxelIndex
          // const voxelType = voxelsTypesBuffer[voxelIndex];
          data.set(`${key}-${voxelType}`, nftIndex);
          break;
        }
      }
    }
  }
  // console.log(data);
  return data;
}

function parseWorldDataBinFile(filePath: string): Buffer {
  try {
    const rawData = readFileSync(filePath);
    return Buffer.from(rawData);
  } catch (error) {
    console.error(`Error reading or parsing ${filePath}:`, error);
    return Buffer.alloc(0); // Return an empty buffer on error
  }
}

function parseNFTsJsonFile(filePath: string): Map<string, number> {
  const data = new Map<string, number>();
  try {
    const rawData = readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(rawData);
    for (const [key, value] of jsonData) {
      data.set(key, Number(value));
    }
  } catch (error) {
    console.error(`Error reading or parsing ${filePath}:`, error);
  }
  return data;
}

function countNumberOfDeadVoxels(voxelsTypesBuffer: Buffer): number {
  let deadCount = 0;
  for (let i = 0; i < voxelsTypesBuffer.length; i++) {
    if (voxelsTypesBuffer[i] === 0) {
      deadCount++;
    }
  }
  return deadCount;
}

if (isMainThread) {
  // Main thread code
  async function main() {
    const startTime = Date.now();

    // Check if world-data.bin and nft.json already exist
    const worldDataExists = existsSync("/world-data/worldData.bin");
    const nftDataExists = existsSync("/world-data/nft.json");

    if (worldDataExists && nftDataExists) {
      console.log("World data and NFT data already exist.");
      console.log("Filling Redis with existing data...");

      const voxelsTypesBuffer = parseWorldDataBinFile(
        "/world-data/worldData.bin"
      );
      const NFT_data = parseNFTsJsonFile("/world-data/nft.json");

      const wsX = Number(process.env.WORLD_SIZE_X);
      const wsY = Number(process.env.WORLD_SIZE_Y);
      const wsZ = Number(process.env.WORLD_SIZE_Z);

      const deadCount = countNumberOfDeadVoxels(voxelsTypesBuffer);
      const aliveCount = wsX * wsY * wsZ - deadCount;

      // Initialize Redis
      console.time("Redis initialization");
      const redis = new Redis({
        host: process.env.GAME_DB_HOST,
        port: parseInt(process.env.GAME_DB_PORT || "6379"),
        password: process.env.GAME_DB_PASSWORD,
      });

      await redis.flushdb();
      await redis.set("world:layer", "5");
      await redis.set("world:nbAlive", aliveCount);
      await redis.set("world:nbDead", deadCount);
      await redis.set("servers:status", "open");

      await redis.quit();
      console.timeEnd("Redis initialization");

      // Multithreaded processing
      console.time("Multithreaded processing");
      const numThreads = os.cpus().length; // Use all available CPU cores
      const chunkSize = 32;
      const chunksPerDimension = Math.ceil(cubeSize / chunkSize);
      const totalChunks =
        chunksPerDimension * chunksPerDimension * chunksPerDimension;
      const chunksPerThread = Math.ceil(totalChunks / numThreads);

      const workers: Worker[] = [];
      let completedChunks = 0;

      for (let i = 0; i < numThreads; i++) {
        const startChunk = i * chunksPerThread;
        const endChunk = Math.min((i + 1) * chunksPerThread, totalChunks);

        const worker = new Worker(__filename, {
          workerData: {
            startChunk,
            endChunk,
            chunkSize,
            cubeSize,
            voxelsTypesBuffer,
            NFT_data: Array.from(NFT_data.entries()),
          },
        });

        workers.push(worker);

        worker.on("message", (message) => {
          completedChunks += message.processedChunks;
          console.log(
            `Worker ${i} progress: ${completedChunks}/${totalChunks} chunks processed`
          );
        });
      }

      await Promise.all(
        workers.map(
          (worker) => new Promise((resolve) => worker.on("exit", resolve))
        )
      );
      console.timeEnd("Multithreaded processing");

      console.log("All workers finished processing");

      // Final database size check
      console.time("Final database check");
      const finalRedis = new Redis({
        host: process.env.GAME_DB_HOST,
        port: parseInt(process.env.GAME_DB_PORT || "6379"),
        password: process.env.GAME_DB_PASSWORD,
      });
      const dbSize = await finalRedis.dbsize();
      console.log(`Final database size: ${dbSize}`);
      await finalRedis.quit();
      console.timeEnd("Final database check");

      const endTime = Date.now();
      console.log(
        `Total execution time: ${(endTime - startTime) / 1000} seconds`
      );
    } else {
      try {
        // Load the image
        const image = await Jimp.read("/app/data/logoBw.png");

        // Generate the cube and overlay the image
        console.time("Cube generation and image overlay");
        const { voxelsTypesBuffer } = generateCube();
        await overlayImageOnCube(voxelsTypesBuffer, image);
        console.timeEnd("Cube generation and image overlay");

        // Write the voxel data to a binary file
        console.time("Writing voxel data to file");
        await fs.writeFile("/world-data/worldData.bin", voxelsTypesBuffer);
        console.timeEnd("Writing voxel data to file");

        const wsX = Number(process.env.WORLD_SIZE_X);
        const wsY = Number(process.env.WORLD_SIZE_Y);
        const wsZ = Number(process.env.WORLD_SIZE_Z);

        // Place NFTs and write data to files
        console.time("NFT data processing");
        const NFT_data = placeNFTs(voxelsTypesBuffer);
        // const nft_data = Array.from(NFT_data.entries());
        await fs.writeFile(
          "/world-data/nft.json",
          JSON.stringify(Array.from(NFT_data.entries()))
        );
        await fs.writeFile(
          "/world-data/nft_keys.txt",
          Array.from(NFT_data.keys()).join("\n")
        );
        console.timeEnd("NFT data processing");

        // Initialize Redis
        console.time("Redis initialization");
        const redis = new Redis({
          host: process.env.GAME_DB_HOST,
          port: parseInt(process.env.GAME_DB_PORT || "6379"),
          password: process.env.GAME_DB_PASSWORD,
        });

        await redis.flushdb();
        await redis.set("world:layer", "5");
        await redis.set("world:nbAlive", wsX * wsY * wsZ);
        await redis.set("world:nbDead", "0");
        await redis.set("servers:status", "open");

        await redis.quit();
        console.timeEnd("Redis initialization");

        // Multithreaded processing
        console.time("Multithreaded processing");
        const numThreads = os.cpus().length; // Use all available CPU cores
        const chunkSize = 32;
        const chunksPerDimension = Math.ceil(cubeSize / chunkSize);
        const totalChunks =
          chunksPerDimension * chunksPerDimension * chunksPerDimension;
        const chunksPerThread = Math.ceil(totalChunks / numThreads);

        const workers: Worker[] = [];
        let completedChunks = 0;

        for (let i = 0; i < numThreads; i++) {
          const startChunk = i * chunksPerThread;
          const endChunk = Math.min((i + 1) * chunksPerThread, totalChunks);

          const worker = new Worker(__filename, {
            workerData: {
              startChunk,
              endChunk,
              chunkSize,
              cubeSize,
              voxelsTypesBuffer,
              NFT_data: Array.from(NFT_data.entries()),
            },
          });

          workers.push(worker);

          worker.on("message", (message) => {
            completedChunks += message.processedChunks;
            console.log(
              `Worker ${i} progress: ${completedChunks}/${totalChunks} chunks processed`
            );
          });
        }

        await Promise.all(
          workers.map(
            (worker) => new Promise((resolve) => worker.on("exit", resolve))
          )
        );
        console.timeEnd("Multithreaded processing");

        console.log("All workers finished processing");

        // Final database size check
        console.time("Final database check");
        const finalRedis = new Redis({
          host: process.env.GAME_DB_HOST,
          port: parseInt(process.env.GAME_DB_PORT || "6379"),
          password: process.env.GAME_DB_PASSWORD,
        });
        const dbSize = await finalRedis.dbsize();
        console.log(`Final database size: ${dbSize}`);
        await finalRedis.quit();
        console.timeEnd("Final database check");

        const endTime = Date.now();
        console.log(
          `Total execution time: ${(endTime - startTime) / 1000} seconds`
        );
      } catch (error) {
        console.error("Error:", error);
      }
    }
  }

  main();
} else {
  // Worker thread code
  const {
    startChunk,
    endChunk,
    chunkSize,
    cubeSize,
    voxelsTypesBuffer,
    NFT_data,
  } = workerData;
  // console.log(NFT_data);
  const NFT_dataMap = new Map(NFT_data);
  // console.log(NFT_data);

  // const NFT_dataMap = NFT_data;
  // console.log(NFT_dataMap);

  const redis = new Redis({
    host: process.env.GAME_DB_HOST,
    port: parseInt(process.env.GAME_DB_PORT || "6379"),
    password: process.env.GAME_DB_PASSWORD,
  });

  async function processChunk(chunkIndex: number) {
    const chunksPerDimension = Math.ceil(cubeSize / chunkSize);
    const z =
      Math.floor(chunkIndex / (chunksPerDimension * chunksPerDimension)) *
      chunkSize;
    const y =
      Math.floor(
        (chunkIndex % (chunksPerDimension * chunksPerDimension)) /
          chunksPerDimension
      ) * chunkSize;
    const x = (chunkIndex % chunksPerDimension) * chunkSize;

    // console.log("chunkb", x, y, z);

    const pipeline = redis.pipeline();
    for (let dx = 0; dx < chunkSize && x + dx < cubeSize; dx++) {
      for (let dy = 0; dy < chunkSize && y + dy < cubeSize; dy++) {
        for (let dz = 0; dz < chunkSize && z + dz < cubeSize; dz++) {
          const xdx = x + dx;
          const ydy = y + dy;
          const zdz = z + dz;
          const key = `${xdx}:${ydy}:${zdz}`;
          // console.log(key);

          const voxelIndex = xdx + ydy * cubeSize + zdz * cubeSize * cubeSize;
          const voxelType = voxelsTypesBuffer[voxelIndex];
          const voxelProps =
            voxelTypes[voxelType as unknown as keyof typeof voxelTypes];
          const hasId = NFT_dataMap.has(`${key}-${voxelType}`);
          const nft_id = hasId
            ? Number(NFT_dataMap.get(`${key}-${voxelType}`)) + 1
            : 0;
          if (hasId) console.log(key, voxelType, nft_id - 1);
          const voxelData = {
            0: voxelProps.hp,
            1: voxelProps.coins,
            2: voxelProps.hpEarned,
            3: voxelProps.enemy,
            4: nft_id,
            5: voxelType,
          };

          pipeline.hset(key, voxelData);
        }
      }
    }
    await pipeline.exec();
  }

  async function workerMain() {
    let processedChunks = 0;
    for (let chunkIndex = startChunk; chunkIndex < endChunk; chunkIndex++) {
      await processChunk(chunkIndex);
      processedChunks++;
      if (processedChunks % 10 === 0) {
        parentPort?.postMessage({ processedChunks: 10 });
      }
    }
    if (processedChunks % 10 !== 0) {
      parentPort?.postMessage({ processedChunks: processedChunks % 10 });
    }
    await redis.quit();
  }

  workerMain();
}
