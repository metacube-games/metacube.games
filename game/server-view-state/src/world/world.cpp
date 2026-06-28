#include "world.h"
#include <iostream>

// error status
const bool NO_ERROR = false;
const bool ERROR = true;

/**
 * @brief Construct a new World object
 *
 * @param sizeX_ the number of voxels on the x-axis
 * @param sizeY_ the number of voxels on the y-axis
 * @param sizeZ_ the number of voxels on the z-axis
 */
World::World(size_t sizeX_, size_t sizeY_, size_t sizeZ_, layerData_t layerData_)
{
    sizeX = (voxelCoordinate_t)sizeX_;
    sizeY = (voxelCoordinate_t)sizeY_;
    sizeZ = (voxelCoordinate_t)sizeZ_;
    layerData = layerData_;
}

/**
 * @brief check that the given coordinates are valid and compute the corresponding key
 *
 * @param voxelCoordinates the coordinates of the voxel
 * @param key where to store the key of the voxel
 * @param skipCheck to only compute the key
 * @return true if the coordinates are valid
 * @return false otherwise
 */
inline bool World::checkCoordinates(const uint8_t *voxelCoordinates, string &key, bool skipCheck)
{

    // retrieve the coordinates
    voxelCoordinate_t x = *(voxelCoordinate_t *)(voxelCoordinates);
    voxelCoordinate_t y = *(voxelCoordinate_t *)(voxelCoordinates + VOXEL_COORDINATE_BS);
    voxelCoordinate_t z = *(voxelCoordinate_t *)(voxelCoordinates + VOXEL_COORDINATE_BS * 2);

    // check if the coordinates are valid
    if (!skipCheck && !(x < sizeX && y < sizeY && z < sizeZ &&
                        (x < layerData.xRangeStart || x >= layerData.xRangeEnd ||
                         z < layerData.zRangeStart || z >= layerData.zRangeEnd ||
                         y < layerData.yRangeStart || y >= layerData.yRangeEnd)))
    {
        return ERROR;
    }
    // compute the key
    stringstream ss;
    ss << x << ":" << y << ":" << z;
    key = ss.str();
    return NO_ERROR;
}

/**
 * @brief hit the voxel at the given coordinates
 *
 * @param redisPool the redis connection pool
 * @param voxelCoordinates the coordinates of the voxel
 * @param damage the number of hp to remove
 * @param voxelState where to store the final voxel state
 * @param voxelHP where to store the final voxel hp
 * @param coinsEarned where to store the number of coins
 * @param hpEarned where to store the hp to add
 * @param enemy where to store the boolean if there is an enemy
 * @param nft where to store the id of the nft
 * @param type where to store the type of the voxel
 * @param skipCheck whether to skip the coordinates check
 * @return true if there is an error
 * @return false otherwise
 */
bool World::hitVoxel(Redis *redisPool, const uint8_t *voxelCoordinates, int damage_, bool &voxelState, voxelHP_t &voxelHP, voxelCoins_t &coinsEarned, playerHP_t &hpEarned, voxelEnemy_t &enemy, voxelNFT_t &nft, voxelType_t &type, bool skipCheck)
{

    string key;

    // check arguments
    if (checkCoordinates(voxelCoordinates, key, skipCheck))
        return ERROR;

    // Initialize voxelState to ALIVE (will be set to DEAD if voxel is destroyed)
    voxelState = ALIVE;

    // convert damage type to match redis types
    long long damage = (long long)damage_;

    // Use pooled Redis client (thread-safe)
    try
    {
        // decrement the voxel's hp and check if it is dead
        long long remainingHPs = redisPool->hincrby(key, VOXEL_FIELD_HP, -damage);

        if (remainingHPs <= 0 && -remainingHPs < damage)
        {
            voxelState = DEAD;
            voxelHP = 0;

            // retrieve the voxel's information
            unordered_map<string, string> voxelInfo;
            redisPool->hgetall(key, inserter(voxelInfo, voxelInfo.begin()));

            coinsEarned = (voxelCoins_t)stoi(voxelInfo[VOXEL_FIELD_COINS]);
            hpEarned = (playerHP_t)stoi(voxelInfo[VOXEL_FIELD_HP_TO_ADD]);
            enemy = (voxelEnemy_t)stoi(voxelInfo[VOXEL_FIELD_ENEMY]);
            nft = (voxelNFT_t)stoi(voxelInfo[VOXEL_FIELD_NFT]);
            type = (voxelType_t)stoi(voxelInfo[VOXEL_FIELD_TYPE]);
        }
        else
        {
            voxelHP = (voxelHP_t)max((long long)0, remainingHPs);
        }
    }
    catch (const sw::redis::Error &err)
    {
        std::cerr << "[REDIS ERROR] Failed Redis operation for hitVoxel: " << err.what() << std::endl;
        return ERROR;
    }

    return NO_ERROR;
}

/**
 * @brief get the hp of the voxel at the given coordinates
 *
 * @param redisPool the redis connection pool
 * @param pos the coordinates of the voxel
 * @param voxelHP where to store the voxel hp
 * @return true if there is an error
 * @return false otherwise
 */
bool World::getHP(Redis *redisPool, const uint8_t *voxelCoordinates, voxelHP_t &voxelHP)
{

    string key;

    // check arguments
    if (checkCoordinates(voxelCoordinates, key))
        return ERROR;

    // Use pooled Redis client (thread-safe)
    try
    {
        // get the voxel's hp
        auto val = redisPool->hget(key, VOXEL_FIELD_HP);

        if (val)
        {
            // convert and store hp value
            voxelHP = (voxelHP_t)max((long long)0, (long long)stoi(*val));
        }
        else
        {
            voxelHP = 0;
        }
    }
    catch (const sw::redis::Error &err)
    {
        std::cerr << "[REDIS ERROR] Failed Redis operation for getHP: " << err.what() << std::endl;
        return ERROR;
    }

    return NO_ERROR;
}

/**
 * @brief change the layer data
 *
 * @param layerData_ the new layer data
 * @return true if there is an error
 * @return false otherwise
 */
bool World::changeLayerData(layerData_t layerData_)
{

    layerData = layerData_;

    return NO_ERROR;
}
