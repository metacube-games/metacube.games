#pragma once

#include <cstddef>
#include <string>
#include <cstring>
#include "common.h"

using namespace std;

string voxelDestroyedMessageBuilder(playerID_t playerID, uint8_t *voxelCoordinates, voxelCoins_t coinsEarned, playerHP_t newHP, voxelEnemy_t enemy, voxelNFT_t nft);
string voxelHPMessageBuilder(voxelHP_t voxelHP, messageType_t type, uint8_t *voxelCoordinates);
string playerDisconnectedMessageBuilder(playerID_t playerID);
string authenticationMessageBuilder(playerID_t playerID, uint8_t *position);
string playerConnectedMessageBuilder(playerID_t playerID, uint8_t skinID, string username, uint8_t usernameLength);
string deadPlayerMessageBuilder(playerID_t playerID, attackType_t deathType);
string playerHitMessageBuilder(uint8_t *playerCoordinates, playerID_t playerID, uint8_t damage);
string playerUpdatedSkinMessageBuilder(playerID_t playerID, uint8_t skinID);

// bomb messages
string bombPlacedMessageBuilder(playerID_t playerID, bombCoordinate_t x, bombCoordinate_t y, bombCoordinate_t z, bombType_t bombType);
string bombExplodedMessageBuilder(playerID_t playerID, bombCoordinate_t x, bombCoordinate_t y, bombCoordinate_t z);

// view servers messages
string leaveQueueMessageBuilder(uint8_t *position);

// DB manager messages
string dbManagerVoxelDestroyedMessageBuilder(uint8_t *publicKey, voxelCoins_t coinsEarned, playerHP_t newHP, voxelNFT_t nft, voxelType_t type);
string dbManagerAttackMessageBuilder(uint8_t *publicKey, voxelCoins_t coinsLost, playerHP_t newHP, attackType_t attackType);
