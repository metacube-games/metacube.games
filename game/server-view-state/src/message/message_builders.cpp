#include "message_builders.h"

/**
 * @brief build the message sent to the players when a voxel is destroyed
 *
 * @param playerID the ID of the player that killed the voxel
 * @param voxelCoordinates the coordinates of the voxel
 * @param coinsEarned the number of coins earned
 * @param newHP the new hp
 * @param enemy the boolean if there is an enemy
 * @param nft the id of the nft
 * @return string the built message
 */
string voxelDestroyedMessageBuilder(playerID_t playerID, uint8_t *voxelCoordinates, voxelCoins_t coinsEarned, playerHP_t newHP, voxelEnemy_t enemy, voxelNFT_t nft)
{

    // create message buffer
    uint8_t buffer[ServerMessage::VOXEL_DESTROYED_LENGTH];
    // add message type
    buffer[TYPE_INDEX] = ServerMessage::VOXEL_DESTROYED_TYPE;
    // add player ID
    memcpy(buffer + TYPE_BS, &playerID, PLAYER_ID_BS);
    // add voxel coordinates
    memcpy(buffer + TYPE_BS + PLAYER_ID_BS, voxelCoordinates, VOXEL_ALL_COORDINATES_BS);
    // add coins
    memcpy(buffer + TYPE_BS + PLAYER_ID_BS + VOXEL_ALL_COORDINATES_BS, &coinsEarned, VOXEL_COINS_BS);
    // add new hp
    buffer[TYPE_BS + PLAYER_ID_BS + VOXEL_ALL_COORDINATES_BS + VOXEL_COINS_BS] = newHP;
    // add enemy
    buffer[TYPE_BS + PLAYER_ID_BS + VOXEL_ALL_COORDINATES_BS + VOXEL_COINS_BS + PLAYER_HP_BS] = enemy;
    // add nft
    memcpy(buffer + TYPE_BS + PLAYER_ID_BS + VOXEL_ALL_COORDINATES_BS + VOXEL_COINS_BS + PLAYER_HP_BS + VOXEL_ENEMY_BS, &nft, VOXEL_NFT_BS);

    return string((const char *)buffer, ServerMessage::VOXEL_DESTROYED_LENGTH);
}

/**
 * @brief build the message sent to the player that asked for voxel's HP
 *
 * @param voxelHP the HP of the voxel
 * @param type the type of the message
 * @param voxelCoordinates the coordinates of the voxel
 * @return string the built message
 */
string voxelHPMessageBuilder(voxelHP_t voxelHP, messageType_t type, uint8_t *voxelCoordinates)
{

    // message length
    size_t messageLength = voxelHP == 0 ? ServerMessage::VOXEL_HP_LENGTH + VOXEL_ALL_COORDINATES_BS : ServerMessage::VOXEL_HP_LENGTH;
    // create message buffer, taking maximum length
    uint8_t buffer[ServerMessage::VOXEL_HP_LENGTH + VOXEL_ALL_COORDINATES_BS];
    // add message type
    buffer[TYPE_INDEX] = type;
    // add voxel HP
    memcpy(buffer + TYPE_BS, &voxelHP, VOXEL_HP_BS);
    // add voxel coordinates if hp is 0
    if (voxelHP == 0)
    {
        memcpy(buffer + TYPE_BS + VOXEL_HP_BS, voxelCoordinates, VOXEL_ALL_COORDINATES_BS);
    }

    return string((const char *)buffer, messageLength);
}

/**
 * @brief build the message sent to the players when one of them is disconnected
 *
 * @param playerID the ID of the disconnected player
 * @return string the built message
 */
string playerDisconnectedMessageBuilder(playerID_t playerID)
{

    // create message buffer
    uint8_t buffer[ServerMessage::PLAYER_DISCONNECTED_LENGTH];
    // add message type
    buffer[TYPE_INDEX] = ServerMessage::PLAYER_DISCONNECTED_TYPE;
    // add player ID
    memcpy(buffer + TYPE_BS, &playerID, PLAYER_ID_BS);

    return string((const char *)buffer, ServerMessage::PLAYER_DISCONNECTED_LENGTH);
}

/**
 * @brief build the message sent to the player after receiving its public key that has been verified
 *
 * @param playerID the player ID
 * @param position the position of the player
 * @return string the built message
 */
string authenticationMessageBuilder(playerID_t playerID, uint8_t *position)
{

    // create message buffer
    uint8_t buffer[ServerMessage::AUTHENTICATION_LENGTH];
    // add message type
    buffer[TYPE_INDEX] = ServerMessage::AUTHENTICATION_TYPE;
    // add player ID
    memcpy(buffer + TYPE_BS, &playerID, PLAYER_ID_BS);
    // add position
    memcpy(buffer + TYPE_BS + PLAYER_ID_BS, position, PLAYER_COORDINATE_BS * 3);

    return string((const char *)buffer, ServerMessage::AUTHENTICATION_LENGTH);
}

/**
 * @brief build the message sent to the players when a new player connects
 *
 * @param playerID the ID of the new player
 * @param skinID the ID of the skin of the new player
 * @param username the username of the new player
 * @param usernameLength the length of the username
 * @return string the built message
 */
string playerConnectedMessageBuilder(playerID_t playerID, uint8_t skinID, string username, uint8_t usernameLength)
{

    // create message buffer
    uint8_t *buffer = new uint8_t[TYPE_BS + PLAYER_ID_BS + PLAYER_USERNAME_LENGTH_BS + usernameLength];
    // add message type
    buffer[TYPE_INDEX] = ServerMessage::PLAYER_CONNECTED_TYPE;
    // add player ID
    memcpy(buffer + TYPE_BS, &playerID, PLAYER_ID_BS);
    // add skin ID
    buffer[TYPE_BS + PLAYER_ID_BS] = skinID;
    // add username length
    buffer[TYPE_BS + PLAYER_ID_BS + PLAYER_SKIN_BS] = usernameLength;
    // add username
    memcpy(buffer + TYPE_BS + PLAYER_ID_BS + PLAYER_SKIN_BS + PLAYER_USERNAME_LENGTH_BS, username.c_str(), usernameLength);

    string message((const char *)buffer, TYPE_BS + PLAYER_ID_BS + PLAYER_SKIN_BS + PLAYER_USERNAME_LENGTH_BS + usernameLength);

    delete[] buffer;

    return message;
}

string bombPlacedMessageBuilder(playerID_t playerID, bombCoordinate_t x, bombCoordinate_t y, bombCoordinate_t z, bombType_t bombType)
{
    uint8_t buffer[ServerMessage::BOMB_PLACED_LENGTH];
    buffer[TYPE_INDEX] = ServerMessage::BOMB_PLACED_TYPE;
    memcpy(buffer + TYPE_BS, &x, BOMB_COORDINATE_BS);
    memcpy(buffer + TYPE_BS + BOMB_COORDINATE_BS, &y, BOMB_COORDINATE_BS);
    memcpy(buffer + TYPE_BS + BOMB_COORDINATE_BS * 2, &z, BOMB_COORDINATE_BS);
    memcpy(buffer + TYPE_BS + BOMB_ALL_COORDINATES_BS, &playerID, PLAYER_ID_BS);
    buffer[TYPE_BS + BOMB_ALL_COORDINATES_BS + PLAYER_ID_BS] = bombType;
    return string((const char *)buffer, ServerMessage::BOMB_PLACED_LENGTH);
}

string bombExplodedMessageBuilder(playerID_t playerID, bombCoordinate_t x, bombCoordinate_t y, bombCoordinate_t z)
{
    uint8_t buffer[ServerMessage::BOMB_EXPLODED_LENGTH];
    buffer[TYPE_INDEX] = ServerMessage::BOMB_EXPLODED_TYPE;
    memcpy(buffer + TYPE_BS, &x, BOMB_COORDINATE_BS);
    memcpy(buffer + TYPE_BS + BOMB_COORDINATE_BS, &y, BOMB_COORDINATE_BS);
    memcpy(buffer + TYPE_BS + BOMB_COORDINATE_BS * 2, &z, BOMB_COORDINATE_BS);
    memcpy(buffer + TYPE_BS + BOMB_ALL_COORDINATES_BS, &playerID, PLAYER_ID_BS);
    return string((const char *)buffer, ServerMessage::BOMB_EXPLODED_LENGTH);
}

/**
 * @brief build the message sent to the viewers when a viewer leaves the queue
 *
 * @param position the position of the viewer in the queue
 * @return string the built message
 */
string leaveQueueMessageBuilder(uint8_t *position)
{

    // create message buffer
    uint8_t buffer[ServerMessage::LEAVE_QUEUE_LENGTH];
    // add message type
    buffer[TYPE_INDEX] = ServerMessage::LEAVE_QUEUE_TYPE;
    // add the position of the player that left the queue
    memcpy(buffer + TYPE_BS, position, GAME_QUEUE_POSITION_BS);

    return string((const char *)buffer, ServerMessage::LEAVE_QUEUE_LENGTH);
}

/**
 * @brief build the message sent to the DB manager when a voxel is destroyed
 *
 * @param publicKey the public key of the player that destroyed the voxel
 * @param coinsEarned the number of coins earned by the player
 * @param newHP the new HP of the player
 * @param nft the id of the nft
 * @param type the type of the voxel
 * @return string the built message
 */
string dbManagerVoxelDestroyedMessageBuilder(uint8_t *publicKey, voxelCoins_t coinsEarned, playerHP_t newHP, voxelNFT_t nft, voxelType_t type)
{

    // create message buffer
    uint8_t *buffer = new uint8_t[ServerMessage::DB_MANAGER_VOXEL_DESTROYED_LENGTH];
    // add message type
    buffer[TYPE_INDEX] = ServerMessage::DB_MANAGER_VOXEL_DESTROYED_TYPE;
    // add public key
    memcpy(buffer + TYPE_BS, publicKey, PUBLIC_KEY_BS);
    // add coins to add
    memcpy(buffer + TYPE_BS + PUBLIC_KEY_BS, &coinsEarned, VOXEL_COINS_BS);
    // add new HP
    buffer[TYPE_BS + PUBLIC_KEY_BS + VOXEL_COINS_BS] = newHP;
    // add nft
    memcpy(buffer + TYPE_BS + PUBLIC_KEY_BS + VOXEL_COINS_BS + PLAYER_HP_BS, &nft, VOXEL_NFT_BS);
    // add type
    buffer[TYPE_BS + PUBLIC_KEY_BS + VOXEL_COINS_BS + PLAYER_HP_BS + VOXEL_NFT_BS] = type;

    return string((const char *)buffer, ServerMessage::DB_MANAGER_VOXEL_DESTROYED_LENGTH);
}

/**
 * @brief build the message sent to the DB manager when a player has been attacked
 *
 * @param publicKey the public key of the player that has been attacked
 * @param coinsLost the number of coins to remove from the player
 * @param attackType the type of the attack
 * @param newHP the new HP of the player
 * @return string the built message
 */
string dbManagerAttackMessageBuilder(uint8_t *publicKey, voxelCoins_t coinsLost, playerHP_t newHP, attackType_t attackType)
{

    // create message buffer
    uint8_t *buffer = new uint8_t[ServerMessage::DB_MANAGER_ATTACK_LENGTH];
    // add message type
    buffer[TYPE_INDEX] = ServerMessage::DB_MANAGER_ATTACK_TYPE;
    // add public key
    memcpy(buffer + TYPE_BS, publicKey, PUBLIC_KEY_BS);
    // add coins to remove
    memcpy(buffer + TYPE_BS + PUBLIC_KEY_BS, &coinsLost, VOXEL_COINS_BS);
    // add new HP
    buffer[TYPE_BS + PUBLIC_KEY_BS + VOXEL_COINS_BS] = newHP;
    // add attack type
    buffer[TYPE_BS + PUBLIC_KEY_BS + VOXEL_COINS_BS + PLAYER_HP_BS] = attackType;

    return string((const char *)buffer, ServerMessage::DB_MANAGER_ATTACK_LENGTH);
}

/**
 * @brief build the message sent to the players when a player is dead
 *
 * @param playerID the ID of the player that is dead
 * @param deathType the type of death
 * @return string the built message
 */
string deadPlayerMessageBuilder(playerID_t playerID, attackType_t deathType)
{

    // create message buffer
    uint8_t buffer[ServerMessage::DEAD_PLAYER_LENGTH];
    // add message type
    buffer[TYPE_INDEX] = ServerMessage::DEAD_PLAYER_TYPE;
    // add player ID
    memcpy(buffer + TYPE_BS, &playerID, PLAYER_ID_BS);
    // add death type
    buffer[TYPE_BS + PLAYER_ID_BS] = deathType;

    return string((const char *)buffer, ServerMessage::DEAD_PLAYER_LENGTH);
}

/**
 * @brief build the message sent to the players when a player is hit
 *
 * @param playerCoordinates the coordinates of the hitting player
 * @param playerID the ID of the player that has been hit
 * @param damage the damage received
 * @return string the built message
 */
string playerHitMessageBuilder(uint8_t *playerCoordinates, playerID_t playerID, uint8_t damage)
{

    // create message buffer
    uint8_t buffer[ServerMessage::PLAYER_HIT_LENGTH];
    // add message type
    buffer[TYPE_INDEX] = ServerMessage::PLAYER_HIT_TYPE;
    // add player position
    memcpy(buffer + TYPE_BS, playerCoordinates, PLAYER_COORDINATE_BS * 3);
    // add player ID
    memcpy(buffer + TYPE_BS + PLAYER_COORDINATE_BS * 3, &playerID, PLAYER_ID_BS);
    // add damage
    buffer[TYPE_BS + PLAYER_COORDINATE_BS * 3 + PLAYER_ID_BS] = damage;

    return string((const char *)buffer, ServerMessage::PLAYER_HIT_LENGTH);
}

/**
 * @brief build the message sent to the players when a player updates its skin
 *
 * @param playerID the ID of the player that updated its skin
 * @param skinID the ID of the new skin
 * @return string the built message
 */
string playerUpdatedSkinMessageBuilder(playerID_t playerID, uint8_t skinID)
{

    // create message buffer
    uint8_t buffer[ServerMessage::PLAYER_UPDATED_SKIN_LENGTH];
    // add message type
    buffer[TYPE_INDEX] = ServerMessage::PLAYER_UPDATED_SKIN_TYPE;
    // add player ID
    memcpy(buffer + TYPE_BS, &playerID, PLAYER_ID_BS);
    // add skin ID
    buffer[TYPE_BS + PLAYER_ID_BS] = skinID;

    return string((const char *)buffer, ServerMessage::PLAYER_UPDATED_SKIN_LENGTH);
}
