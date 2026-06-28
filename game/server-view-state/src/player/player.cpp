#include <chrono>
#include <cmath>
#include <iostream>
#include <queue>
#include "player.h"

// error status
const bool NO_ERROR = false;
const bool ERROR = true;

// functions declaration
bool addToBuffer(PlayerData *player, uint8_t *playersPositionsBuffer, size_t &currBufferEndOffset, uint8_t *position);
bool computeRandomInitialPosition(uint8_t *position);

/**
 * @brief add the player's id and position to the buffer
 *
 * @param player the pointer to the new player's data
 * @param playersPositionsBuffer the buffer containing all the players' positions
 * @param currBufferEndOffset the current end offset of the buffer
 * @param position the new position
 * @return true
 * @return false
 */
bool addToBuffer(PlayerData *player, uint8_t *playersPositionsBuffer, size_t &currBufferEndOffset, uint8_t *position)
{

    // copy the player's id and position in the buffer
    memcpy(playersPositionsBuffer + currBufferEndOffset, &player->id, PLAYER_ID_BS);
    memcpy(playersPositionsBuffer + currBufferEndOffset + PLAYER_ID_BS, position, PLAYER_POSITION_BS);
    // update player's offset
    player->bufferOffset = currBufferEndOffset;
    // move the current buffer end offset
    currBufferEndOffset += PLAYER_ID_BS + PLAYER_POSITION_BS;

    return NO_ERROR;
}

// available player ids
queue<playerID_t> freeIDs;

/**
 * @brief initialize the available player ids
 *
 * @param id the id of the server
 * @param nbPlayers the number of players
 */
void initFreeIDs(uint8_t id, int nbPlayers)
{
    for (playerID_t i = (playerID_t)(id * nbPlayers + 1); i < id * nbPlayers + nbPlayers + 1; i++)
    {
        freeIDs.push(i);
    }
}

/**
 * @brief read all player's in-game info
 *
 * @param player the pointer to the player's data
 * @param playerInfo the player's info
 * @return true if there is an error
 * @return false otherwise
 */
bool readPlayerInfo(PlayerData *player, unordered_map<string, string> &playerInfo)
{

    // get player's damage
    if (playerInfo.find(PLAYER_FIELD_DAMAGE) == playerInfo.end())
    {
        return ERROR;
    }
    player->damage = stoi(playerInfo[PLAYER_FIELD_DAMAGE]);
    // get player's coins multiplier
    if (playerInfo.find(PLAYER_FIELD_COINS_MULTIPLIER) == playerInfo.end())
    {
        return ERROR;
    }
    player->coinsMultiplier = 1.0 + stoi(playerInfo[PLAYER_FIELD_COINS_MULTIPLIER]) / 100.0;
    // get player's critical hit
    if (playerInfo.find(PLAYER_FIELD_CRITICAL_HIT) == playerInfo.end())
    {
        return ERROR;
    }
    player->criticalHit = (uint8_t)(stoi(playerInfo[PLAYER_FIELD_CRITICAL_HIT]) * CRITICAL_HIT_STEP);
    // get player's max hp
    if (playerInfo.find(PLAYER_FIELD_MAX_HP) == playerInfo.end())
    {
        return ERROR;
    }
    player->maxHP = (playerHP_t)stoi(playerInfo[PLAYER_FIELD_MAX_HP]);
    // get player's hp
    if (playerInfo.find(PLAYER_FIELD_HP) == playerInfo.end() || stoi(playerInfo[PLAYER_FIELD_HP]) == 0)
    {
        return ERROR;
    }
    player->hp = (playerHP_t)stoi(playerInfo[PLAYER_FIELD_HP]);
    // get player's skin id
    if (playerInfo.find(PLAYER_FIELD_SKIN_ID) == playerInfo.end())
    {
        return ERROR;
    }
    player->skinId = (uint8_t)stoi(playerInfo[PLAYER_FIELD_SKIN_ID]);

    return NO_ERROR;
}

/**
 * @brief compute a random initial position
 *
 * @param position where to store the new position (only x, y and z)
 * @return true if there is an error
 * @return false otherwise
 */
bool computeRandomInitialPosition(uint8_t *position)
{
    // use the current time to compute a random position
    uint64_t timestamp = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
    // the random position is in the rectangle in front of the cube
    int x = (int)(SPAWN_START_X + floor(((double)((timestamp >> 8) & 0xFF) / 255.0) * SPAWN_RANGE_X));
    int z = (int)(SPAWN_START_Z + floor(((double)(timestamp & 0xFF) / 255.0) * SPAWN_RANGE_Z));
    // encode the position
    playerCoordinate_t x_encoded = (playerCoordinate_t)((x + 131) * 120);
    playerCoordinate_t z_encoded = (playerCoordinate_t)((z + 156) * 120);
    playerCoordinate_t y_encoded = (playerCoordinate_t)((SPAWN_Y_POSITION + 131) * 120);
    // store the position
    position[0] = (uint8_t)x_encoded;
    position[1] = (uint8_t)(x_encoded >> 8);
    position[2] = (uint8_t)y_encoded;
    position[3] = (uint8_t)(y_encoded >> 8);
    position[4] = (uint8_t)z_encoded;
    position[5] = (uint8_t)(z_encoded >> 8);
    return NO_ERROR;
}

/**
 * @brief initialize the new player's data
 *
 * @param redisPool the redis connection pool
 * @param player the pointer to the new player's data
 * @param playersPositionsBuffer the buffer containing all the players' positions
 * @param currBufferEndOffset the current end offset of the buffer
 * @param playersPositionsBufferMutex the mutex used to protect the buffer
 * @param publicKey the public key of the new player
 * @param serverIdStr the id of the server
 * @param username where to store the username of the new player
 * @param usernameLength where to store the length of the username
 * @param position where to store the new position (only x, y and z)
 * @return true if there is an error
 * @return false otherwise
 */
bool initPlayer(Redis *redisPool, PlayerData *player, uint8_t *playersPositionsBuffer, size_t &currBufferEndOffset, mutex &playersPositionsBufferMutex, uint8_t *publicKey, string serverIdStr, string &username, uint8_t &usernameLength, uint8_t *position)
{

    // check if the server is full
    if (freeIDs.empty())
        return ERROR;

    // save the public key
    memcpy(player->publicKey, publicKey, PUBLIC_KEY_BS);
    player->publicKeyStr = string((const char *)publicKey, PUBLIC_KEY_BS);

    // Get connection from pool for database operations
    unordered_map<string, string> playerInfo;
    try
    {

        // retrieve player's information from redis
        redisPool->hgetall(player->publicKeyStr, inserter(playerInfo, playerInfo.begin()));

        // check if the player is already in the game
        if (playerInfo.find(PLAYER_FIELD_IS_CONNECTED) == playerInfo.end())
            return ERROR;

        string isConnectedValue = playerInfo[PLAYER_FIELD_IS_CONNECTED];

        if (isConnectedValue != PLAYER_FIELD_IS_CONNECTED_FALSE)
        {
            // Force update to disconnected state so the player can reconnect on next attempt
            redisPool->hset(player->publicKeyStr, PLAYER_FIELD_IS_CONNECTED, PLAYER_FIELD_IS_CONNECTED_FALSE);
            redisPool->hset(player->publicKeyStr, PLAYER_FIELD_SERVER_ID, PLAYER_FIELD_SERVER_ID_NONE);
            return ERROR;
        }
        // check that the player is in the right server
        if (playerInfo.find(PLAYER_FIELD_SERVER_ID) == playerInfo.end() || playerInfo[PLAYER_FIELD_SERVER_ID] != serverIdStr)
            return ERROR;
        // get player's username
        if (playerInfo.find(PLAYER_FIELD_USERNAME) == playerInfo.end())
            return ERROR;
        username = playerInfo[PLAYER_FIELD_USERNAME];
        usernameLength = (uint8_t)username.length();
        // get player's in-game info
        if (readPlayerInfo(player, playerInfo))
        {
            return ERROR;
        }

        // update player's info in redis
        redisPool->hset(player->publicKeyStr, PLAYER_FIELD_IS_CONNECTED, PLAYER_FIELD_IS_CONNECTED_TRUE);

        // update the players count in redis
        redisPool->hincrby(SERVERS_KEY, serverIdStr, 1);
    }
    catch (const sw::redis::Error &err)
    {
        std::cerr << "[REDIS ERROR] Failed Redis operation for initPlayer: " << err.what() << std::endl;
        return ERROR;
    }

    player->isVerified = true;

    // get an id for the player
    player->id = freeIDs.front();
    freeIDs.pop();

    // initialize the player's position
    if (computeRandomInitialPosition(position))
    {
        return ERROR;
    }

    // add the player's id and position to the buffer
    playersPositionsBufferMutex.lock();
    if (addToBuffer(player, playersPositionsBuffer, currBufferEndOffset, position))
    {
        playersPositionsBufferMutex.unlock();
        return ERROR;
    }
    playersPositionsBufferMutex.unlock();

    // TODO EXPERIMENTAL
    player->nbClicks = 0;
    player->lastClicksEpochTimestamp = 0;

    // Bomb system initialization
    player->bombActive = false;
    player->lastBombTime = 0;
    player->bombType = 0;
    player->bombX = 0;
    player->bombY = 0;
    player->bombZ = 0;

    return NO_ERROR;
}

/**
 * @brief update the position of the given player with the given position
 *
 * @param player the pointer to the player's data
 * @param playersPositionsBuffer the buffer containing all the players' positions
 * @param currBufferEndOffset the current end offset of the buffer
 * @param playersPositionsBufferMutex the mutex used to protect the buffer
 * @param position the new position
 * @return true if there is an error
 * @return false otherwise
 */
bool updatePlayerPosition(PlayerData *player, uint8_t *playersPositionsBuffer, size_t &currBufferEndOffset, mutex &playersPositionsBufferMutex, uint8_t *position)
{

    // take the lock
    playersPositionsBufferMutex.lock();
    // check if the player has already been added to the current buffer
    if (player->bufferOffset < currBufferEndOffset && *(playerID_t *)(playersPositionsBuffer + player->bufferOffset) == player->id)
    {
        // update the player's position
        memcpy(playersPositionsBuffer + player->bufferOffset + PLAYER_ID_BS, position, PLAYER_POSITION_BS);
    }
    else
    {
        // add the player's id and position to the buffer
        addToBuffer(player, playersPositionsBuffer, currBufferEndOffset, position);
    }
    // release the lock
    playersPositionsBufferMutex.unlock();

    return NO_ERROR;
}

bool computeDamage(PlayerData *player, uint64_t timestamp, int &damage, bool &isCriticalHit)
{
    // get last byte of the timestamp
    uint8_t lastTwoDigits = timestamp & 0xFF;
    // check if the player can have a critical hit
    if (lastTwoDigits < player->criticalHit)
    {
        // compute the damage
        damage *= CRITICAL_HIT_MULTIPLIER;
        isCriticalHit = true;
    }

    return NO_ERROR;
}

/**
 * @brief check clicks epoch for potential cheating
 *
 * @param player the pointer to the player's data
 * @param timestamp the current timestamp
 * @return true if the player is estimated to be cheating
 * @return false otherwise
 */
bool updateClickTimestamp(PlayerData *player, uint64_t timestamp)
{

    // TODO [EXPERIMENTAL]
    player->nbClicks++;
    if (player->nbClicks >= NB_CLICKS_PER_EPOCH)
    {
        if (timestamp - player->lastClicksEpochTimestamp < MIN_CLICKS_EPOCH_INTERVAL_MS)
        {
            return ERROR;
        }
        player->nbClicks = 0;
        player->lastClicksEpochTimestamp = timestamp;
    }

    return NO_ERROR;
}

/**
 * @brief attack the player
 *
 * @param player the pointer to the player's data
 * @param attackType the type of the attack
 * @param coinsLost where to store the number of coins to remove
 * @return true if there is an error
 * @return false otherwise
 */
bool attackPlayer(PlayerData *player, attackType_t attackType, voxelCoins_t *coinsLost)
{

    // check if the attack type is valid
    if (attackType >= NB_ATTACKS)
        return ERROR;

    // update the player's hp with min to 0
    player->hp = (playerHP_t)max(player->hp - ALL_ATTACKS_DATA[attackType].hpLoss, 0);
    // store the number of coins to remove
    *coinsLost = ALL_ATTACKS_DATA[attackType].coinLoss;

    return NO_ERROR;
}

/**
 * @brief disconnect properly the player
 *
 * @param redisPool the redis connection pool
 * @param player the pointer to the player's data
 * @param serverIdStr the id of the server
 * @return true if there is an error
 * @return false otherwise
 */
bool disconnectPlayer(Redis *redisPool, PlayerData *player, string serverIdStr)
{
    // Clear bomb state on disconnect (cleanup active bombs)
    player->bombActive = false;

    // Get connection from pool for database operations
    try
    {

        // update player's info in redis
        unordered_map<string, string> updatedInfo = {
            {PLAYER_FIELD_IS_CONNECTED, PLAYER_FIELD_IS_CONNECTED_FALSE},
            {PLAYER_FIELD_SERVER_ID, PLAYER_FIELD_SERVER_ID_NONE},
        };
        redisPool->hmset(player->publicKeyStr, updatedInfo.begin(), updatedInfo.end());

        // add the player's id to the available player ids
        freeIDs.push(player->id);

        // update the players count in redis
        redisPool->hincrby(SERVERS_KEY, serverIdStr, -1);

        // add the server id in the available server queue
        redisPool->rpush(SERVERS_QUEUE_KEY, serverIdStr);
    }
    catch (const sw::redis::Error &err)
    {
        std::cerr << "[REDIS ERROR] Failed Redis operation for disconnectPlayer: " << err.what() << std::endl;
        // Still add player ID back to free pool even if Redis fails
        freeIDs.push(player->id);
        return ERROR;
    }

    return NO_ERROR;
}
