#pragma once

#include <hiredis/hiredis.h>
#include <sw/redis++/redis++.h>
#include "common.h"

using namespace std;
using namespace sw::redis;

typedef struct PlayerData
{
    int socketID;
    playerID_t id;
    uint8_t skinId;
    size_t bufferOffset;
    bool isVerified;
    int damage;
    double coinsMultiplier;
    uint8_t criticalHit;
    playerHP_t maxHP;
    playerHP_t hp;
    uint8_t publicKey[PUBLIC_KEY_BS];
    string publicKeyStr;
    // TODO security [EXPERIMENTAL]
    uint8_t nbClicks;
    uint64_t lastClicksEpochTimestamp;
    // Bomb system
    bool bombActive;
    uint64_t lastBombTime;
    bombType_t bombType;
    bombCoordinate_t bombX, bombY, bombZ;
} PlayerData;

void initFreeIDs(uint8_t id, int nbPlayers);

bool readPlayerInfo(PlayerData *player, unordered_map<string, string> &playerInfo);
// Using Redis client with connection pool (thread-safe, pool managed internally)
bool initPlayer(Redis *redisPool, PlayerData *player, uint8_t *playersPositionsBuffer, size_t &currBufferEndOffset, mutex &playersPositionsBufferMutex, uint8_t *publicKey, string serverIdStr, string &username, uint8_t &usernameLength, uint8_t *position);
bool updatePlayerPosition(PlayerData *player, uint8_t *playersPositionsBuffer, size_t &currBufferEndOffset, mutex &playersPositionsBufferMutex, uint8_t *position);
bool computeDamage(PlayerData *player, uint64_t timestamp, int &damage, bool &isCriticalHit);
bool updateClickTimestamp(PlayerData *player, uint64_t timestamp);
bool attackPlayer(PlayerData *player, attackType_t attackType, voxelCoins_t *coinsLost);
bool disconnectPlayer(Redis *redisPool, PlayerData *player, string serverIdStr);
