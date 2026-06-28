#pragma once

#include <hiredis/hiredis.h>
#include <sw/redis++/redis++.h>
#include "common.h"

using namespace std;
using namespace sw::redis;

// voxels state
const bool ALIVE = false;
const bool DEAD = true;

class World
{
private:
    voxelCoordinate_t sizeX;
    voxelCoordinate_t sizeY;
    voxelCoordinate_t sizeZ;
    layerData_t layerData;

    inline bool checkCoordinates(const uint8_t *voxelCoordinates, string &key, bool skipCheck = false);

public:
    World(size_t sizeX_, size_t sizeY_, size_t sizeZ_, layerData_t layerData_);

    // Using Redis client with connection pool (thread-safe, pool managed internally)
    bool hitVoxel(Redis *redisPool, const uint8_t *voxelCoordinates, int damage_, bool &voxelState, voxelHP_t &voxelHP, voxelCoins_t &coinsEarned, playerHP_t &hpEarned, voxelEnemy_t &enemy, voxelNFT_t &nft, voxelType_t &type, bool skipCheck = false);
    bool getHP(Redis *redisPool, const uint8_t *voxelCoordinates, voxelHP_t &voxelHP);
    bool changeLayerData(layerData_t layerData_);
};