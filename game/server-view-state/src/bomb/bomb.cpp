#include "bomb.h"
#include "App.h"
#include "common.h"
#include "world.h"
#include "player.h"
#include "message_builders.h"
#include <hiredis/hiredis.h>
#include <sw/redis++/redis++.h>
#include <iostream>
#include <cstring>
#include <algorithm>

using namespace std;
using namespace sw::redis;

extern unordered_map<string, uWS::WebSocket<false, true, PlayerData> *> sockets;
extern World *world;
extern Redis *redisPool;

void explodeBomb(const PendingBomb &bomb)
{
    const bombData_t &bombData = ALL_BOMBS_DATA[bomb.bombType];
    int bombDamage = bomb.damage * bombData.damageMultiplier;

    auto socketIt = sockets.find(bomb.publicKeyStr);
    bool isConnected = socketIt != sockets.end();

    PlayerData *player = nullptr;
    if (isConnected)
    {
        player = (PlayerData *)socketIt->second->getUserData();
    }

    playerHP_t finalHp = 0;
    if (isConnected)
    {
        finalHp = player->hp;
    }
    else
    {
        try
        {
            auto cached = redisPool->hget(bomb.publicKeyStr, PLAYER_FIELD_HP);
            if (cached)
                finalHp = (playerHP_t)stoi(*cached);
        }
        catch (const sw::redis::Error &)
        {
        }
    }

    try
    {
        for (int dx = bombData.rangeMinX; dx <= bombData.rangeMaxX; dx++)
        {
            for (int dy = bombData.rangeMinY; dy <= bombData.rangeMaxY; dy++)
            {
                for (int dz = bombData.rangeMinZ; dz <= bombData.rangeMaxZ; dz++)
                {
                    int vx = bomb.bombX + dx;
                    int vy = bomb.bombY + dy;
                    int vz = bomb.bombZ + dz;

                    if (vx < 0 || vy < 0 || vz < 0)
                        continue;

                    voxelCoordinate_t x = (voxelCoordinate_t)vx;
                    voxelCoordinate_t y = (voxelCoordinate_t)vy;
                    voxelCoordinate_t z = (voxelCoordinate_t)vz;

                    uint8_t coords[VOXEL_ALL_COORDINATES_BS];

                    memcpy(coords, &x, VOXEL_COORDINATE_BS);
                    memcpy(coords + 2, &y, VOXEL_COORDINATE_BS);
                    memcpy(coords + 4, &z, VOXEL_COORDINATE_BS);

                    bool voxelState = ALIVE;
                    voxelHP_t voxelHP = 0;
                    voxelCoins_t coinsEarned = 0;
                    playerHP_t hpEarned = 0;
                    voxelEnemy_t enemy = 0;
                    voxelNFT_t nft = 0;
                    voxelType_t type = 0;

                    if (world->hitVoxel(redisPool, coords, bombDamage, voxelState, voxelHP, coinsEarned, hpEarned, enemy, nft, type, true))
                        continue;

                    if (voxelState == DEAD)
                    {
                        voxelCoins_t scaledCoins = static_cast<voxelCoins_t>(coinsEarned * bomb.coinsMultiplier);
                        if (isConnected)
                        {
                            finalHp = (playerHP_t)min((int)player->maxHP, (int)(player->hp + hpEarned));
                            player->hp = finalHp;
                        }
                        redisPool->publish(REDIS_CHANNEL_BROADCAST, voxelDestroyedMessageBuilder(bomb.id, coords, scaledCoins, finalHp, enemy, nft));
                        redisPool->publish(REDIS_CHANNEL_DB_MANAGER, dbManagerVoxelDestroyedMessageBuilder(const_cast<uint8_t *>(bomb.publicKey), scaledCoins, finalHp, nft, type));
                    }
                }
            }
        }

        if (isConnected)
        {
            if (finalHp != player->hp)
                redisPool->hset(bomb.publicKeyStr, PLAYER_FIELD_HP, to_string(static_cast<unsigned int>(player->hp)));
            player->bombActive = false;
        }

        redisPool->publish(REDIS_CHANNEL_BROADCAST, bombExplodedMessageBuilder(bomb.id, bomb.bombX, bomb.bombY, bomb.bombZ));
    }
    catch (const sw::redis::Error &err)
    {
        if (isConnected)
        {
            player->bombActive = false;
        }
        cerr << "[REDIS ERROR] Failed Redis operation for bomb explosion: " << err.what() << endl;
    }
}
