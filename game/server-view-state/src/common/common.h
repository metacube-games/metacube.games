#pragma once

#include <cstdint>
#include <cstddef>
#include <string>

using namespace std;

// Note: BS stands for bytes size

//==============================================================================
// Websockets
//==============================================================================
const int KICK_END_CODE = 3000;
const int DEAD_END_CODE = 3001;

//==============================================================================
// Game
//==============================================================================
const int MAX_PLAYERS = 10000;
const int CRITICAL_HIT_STEP = 3.0; // represents ~1%
const int CRITICAL_HIT_MULTIPLIER = 10;
const int SPAWN_Y_POSITION = 2;
const int SPAWN_START_X = 70;
const int SPAWN_RANGE_X = 120;
const int SPAWN_START_Z = -60;
const int SPAWN_RANGE_Z = 40;

//==============================================================================
// Security
//==============================================================================
// TODO [EXPERIMENTAL]
const uint8_t NB_CLICKS_PER_EPOCH = 150;
const uint64_t MIN_CLICKS_EPOCH_INTERVAL_MS = 10000;

//==============================================================================
// Player
//==============================================================================
typedef uint16_t playerID_t;
typedef uint16_t playerCoordinate_t;
typedef uint8_t playerHP_t;

const size_t PLAYER_ID_BS = sizeof(playerID_t);
const size_t PLAYER_COORDINATE_BS = sizeof(playerCoordinate_t);
const size_t NB_PLAYER_BODY_POSITIONS = 3;
const size_t PLAYER_POSITION_BS = PLAYER_COORDINATE_BS * 3 + NB_PLAYER_BODY_POSITIONS;
const size_t PUBLIC_KEY_BS = 64;
const size_t PLAYER_USERNAME_LENGTH_BS = 1;
const size_t PLAYER_HP_BS = sizeof(playerHP_t);
const size_t GAME_QUEUE_POSITION_BS = 2;
const size_t ACHIEVEMENT_BS = 3;
const size_t PLAYER_DAMAGE_BS = 1;
const size_t PLAYER_SKIN_BS = 1;

//==============================================================================
// World
//==============================================================================
typedef uint16_t voxelCoordinate_t;
typedef uint32_t voxelHP_t;
typedef uint32_t voxelCoins_t;
typedef uint8_t voxelEnemy_t;
typedef uint16_t voxelNFT_t;
typedef uint8_t voxelType_t;

const size_t VOXEL_COORDINATE_BS = sizeof(voxelCoordinate_t);
const size_t VOXEL_ALL_COORDINATES_BS = VOXEL_COORDINATE_BS * 3;
const size_t VOXEL_HP_BS = sizeof(voxelHP_t);
const size_t VOXEL_COINS_BS = sizeof(voxelCoins_t);
const size_t VOXEL_ENEMY_BS = sizeof(voxelEnemy_t);
const size_t VOXEL_NFT_BS = sizeof(voxelNFT_t);
const size_t VOXEL_TYPE_BS = sizeof(voxelType_t);

// NOTE: start is included, end is excluded (half-open interval [start, end)).
typedef struct layerData
{
    voxelCoordinate_t xRangeStart;
    voxelCoordinate_t xRangeEnd;
    voxelCoordinate_t yRangeStart;
    voxelCoordinate_t yRangeEnd;
    voxelCoordinate_t zRangeStart;
    voxelCoordinate_t zRangeEnd;
} layerData_t;

const size_t LAYER_BS = sizeof(uint8_t);

const uint8_t NB_LAYERS = 11;

const layerData_t ALL_LAYERS_DATA[NB_LAYERS] = {
    {256, 0, 256, 0, 256, 0},    // LAYER 0, 32768 voxels
    {112, 144, 0, 32, 112, 144}, // LAYER 1, 1441792 voxels
    {80, 176, 0, 160, 80, 176},  // LAYER 2, 3440640 voxels
    {48, 208, 0, 192, 48, 208},  // LAYER 3, 3342336 voxels
    {32, 224, 0, 224, 32, 224},  // LAYER 4, 3784704 voxels
    {16, 240, 0, 240, 16, 240},  // LAYER 5, 4734976 voxels
    {0, 0, 0, 0, 0, 0},          // DUMMY
    {0, 0, 0, 0, 0, 0},          // DUMMY
    {0, 0, 0, 0, 0, 0},          // DUMMY
    {0, 0, 0, 0, 0, 0},          // DUMMY
    {256, 0, 256, 0, 256, 0},    // GAME IS FINISHED
};

//==============================================================================
// Attacks
//==============================================================================
typedef uint8_t attackType_t;

const size_t ATTACK_TYPE_BS = sizeof(attackType_t);

typedef struct attackData
{
    const playerHP_t hpLoss;
    const voxelCoins_t coinLoss;
} attackData_t;

const uint8_t NB_ATTACKS = 5;

const attackData_t ALL_ATTACKS_DATA[NB_ATTACKS] = {
    {1, 0},   // 0: FALL 1
    {2, 0},   // 1: FALL 2
    {3, 0},   // 2: FALL 3
    {1, 100}, // 3: FISC 1
    {1, 0}    // 4: CUBE 1
};

//==============================================================================
// Bombs
//==============================================================================
typedef int16_t bombCoordinate_t;
typedef uint8_t bombType_t;

const size_t BOMB_COORDINATE_BS = sizeof(bombCoordinate_t);
const size_t BOMB_ALL_COORDINATES_BS = BOMB_COORDINATE_BS * 3;
const size_t BOMB_TYPE_BS = sizeof(bombType_t);
const size_t BOMB_FUSE_TIME_MS = 2500;

typedef struct bombData
{
    const int8_t rangeMinX;
    const int8_t rangeMaxX;
    const int8_t rangeMinY;
    const int8_t rangeMaxY;
    const int8_t rangeMinZ;
    const int8_t rangeMaxZ;
    const uint8_t damageMultiplier;
} bombData_t;

const uint8_t NB_BOMB_TYPES = 6;

const bombData_t ALL_BOMBS_DATA[NB_BOMB_TYPES] = {
    {0, 0, 0, 0, 0, 0, 0},     // DUMMY
    {-1, 0, -1, 0, -1, 0, 5},  // 1: MINI,     2×2×2
    {-1, 1, -1, 1, -1, 1, 10}, // 2: STANDARD, 3×3×3
    {-2, 1, -2, 1, -2, 1, 15}, // 3: HEAVY,    4×4×4
    {-2, 2, -2, 2, -2, 2, 20}, // 4: MEGA,     5×5×5
    {-3, 2, -3, 2, -3, 2, 25}, // 5: ULTRA,    6×6×6
};

//==============================================================================
// Messages
//==============================================================================
const string WS_CHANNEL = "0";

typedef uint8_t messageType_t;

const size_t TYPE_BS = sizeof(messageType_t);
const size_t TYPE_INDEX = 0;

namespace ServerMessage
{
    const messageType_t PLAYERS_POSITIONS_TYPE = 0;
    const messageType_t VOXEL_HP_TYPE = 1;
    const messageType_t VOXEL_HP_HIT_TYPE = 2;
    const messageType_t VOXEL_HP_CRITICAL_HIT_TYPE = 3;
    const size_t VOXEL_HP_LENGTH = TYPE_BS + VOXEL_HP_BS;
    const messageType_t VOXEL_DESTROYED_TYPE = 4;
    const size_t VOXEL_DESTROYED_LENGTH = TYPE_BS + PLAYER_ID_BS + VOXEL_ALL_COORDINATES_BS + VOXEL_COINS_BS + PLAYER_HP_BS + VOXEL_ENEMY_BS + VOXEL_NFT_BS;
    const messageType_t AUTHENTICATION_TYPE = 5;
    const size_t AUTHENTICATION_LENGTH = TYPE_BS + PLAYER_ID_BS + PLAYER_COORDINATE_BS * 3;
    const messageType_t PLAYER_DISCONNECTED_TYPE = 6;
    const size_t PLAYER_DISCONNECTED_LENGTH = TYPE_BS + PLAYER_ID_BS;
    const messageType_t PLAYER_CONNECTED_TYPE = 7;
    const messageType_t DEAD_PLAYER_TYPE = 8;
    const size_t DEAD_PLAYER_LENGTH = TYPE_BS + PLAYER_ID_BS + ATTACK_TYPE_BS;
    const messageType_t CHANGE_LAYER_TYPE = 9;
    const size_t CHANGE_LAYER_LENGTH = TYPE_BS + LAYER_BS;
    const messageType_t PLAYER_HIT_TYPE = 15;
    const size_t PLAYER_HIT_LENGTH = TYPE_BS + PLAYER_COORDINATE_BS * 3 + PLAYER_ID_BS + PLAYER_DAMAGE_BS;
    const messageType_t PLAYER_UPDATED_SKIN_TYPE = 16;
    const size_t PLAYER_UPDATED_SKIN_LENGTH = TYPE_BS + PLAYER_ID_BS + PLAYER_SKIN_BS;
    const messageType_t BOMB_PLACED_TYPE = 17;
    const size_t BOMB_PLACED_LENGTH = TYPE_BS + BOMB_ALL_COORDINATES_BS + PLAYER_ID_BS + BOMB_TYPE_BS;
    const messageType_t BOMB_EXPLODED_TYPE = 18;
    const size_t BOMB_EXPLODED_LENGTH = TYPE_BS + BOMB_ALL_COORDINATES_BS + PLAYER_ID_BS;

    // view servers messages
    // type 10 is the next player message coming from the game queue manager
    const messageType_t LEAVE_QUEUE_TYPE = 11;
    const size_t LEAVE_QUEUE_LENGTH = TYPE_BS + GAME_QUEUE_POSITION_BS;

    // special messages
    const messageType_t START_MAINTENANCE_TYPE = 20;
    const messageType_t STOP_MAINTENANCE_TYPE = 21;

    // DB manager messages
    const messageType_t DB_MANAGER_VOXEL_DESTROYED_TYPE = 30;
    const size_t DB_MANAGER_VOXEL_DESTROYED_LENGTH = TYPE_BS + PUBLIC_KEY_BS + VOXEL_COINS_BS + PLAYER_HP_BS + VOXEL_NFT_BS + VOXEL_TYPE_BS;
    const messageType_t DB_MANAGER_ATTACK_TYPE = 31;
    const size_t DB_MANAGER_ATTACK_LENGTH = TYPE_BS + PUBLIC_KEY_BS + VOXEL_COINS_BS + PLAYER_HP_BS + ATTACK_TYPE_BS;

    // notifications
    const messageType_t ACHIEVEMENT_NOTIFICATION_TYPE = 40;
    const size_t ACHIEVEMENT_NOTIFICATION_LENGTH = TYPE_BS + PUBLIC_KEY_BS + ACHIEVEMENT_BS;
}

namespace ClientMessage
{
    const size_t COUNT = 8;
    const size_t MAX_LENGTH = 65;

    const messageType_t MOVE_TYPE = 0;
    const size_t MOVE_LENGTH = TYPE_BS + PLAYER_POSITION_BS;
    const messageType_t HIT_VOXEL_TYPE = 1;
    const size_t HIT_VOXEL_LENGTH = TYPE_BS + VOXEL_ALL_COORDINATES_BS;
    const messageType_t GET_HP_TYPE = 2;
    const size_t GET_HP_LENGTH = TYPE_BS + VOXEL_ALL_COORDINATES_BS;
    const messageType_t CONNECT_TYPE = 3;
    const size_t CONNECT_LENGTH = TYPE_BS + PUBLIC_KEY_BS;
    const messageType_t ATTACK_TYPE = 4;
    const size_t ATTACK_LENGTH = TYPE_BS + TYPE_BS;
    const messageType_t UPDATE_INFO_TYPE = 5;
    const size_t UPDATE_INFO_LENGTH = TYPE_BS;
    const messageType_t HIT_PLAYER_TYPE = 6;
    const size_t HIT_PLAYER_LENGTH = TYPE_BS + PLAYER_COORDINATE_BS * 3 + PLAYER_ID_BS;
    const messageType_t PLACE_BOMB_TYPE = 7;
    const size_t PLACE_BOMB_LENGTH = TYPE_BS + VOXEL_ALL_COORDINATES_BS + BOMB_TYPE_BS;

    // view clients messages
    const messageType_t LEAVE_QUEUE_TYPE = 10;
    const size_t LEAVE_QUEUE_LENGTH = TYPE_BS + GAME_QUEUE_POSITION_BS;
}

//==============================================================================
// Redis
//==============================================================================
// channels
const string REDIS_CHANNEL_BROADCAST = "0";
const string REDIS_CHANNEL_PLAYERS_POSITIONS = "1";
const string REDIS_CHANNEL_PLAYER_DISCONNECTED = "2";
const string REDIS_CHANNEL_VIEW_SERVERS = "3";
const string REDIS_CHANNEL_DB_MANAGER = "4";
const string REDIS_CHANNEL_CONTROL_CENTER = "5";
const string REDIS_CHANNEL_KICK_PLAYER = "6";
const string REDIS_CHANNEL_CHANGE_LAYER = "7";
const string REDIS_CHANNEL_ACHIEVEMENT_NOTIFICATION = "8";

// world keys
const string WORLD_KEY_LAYER = "world:layer";
const string WORLD_KEY_NB_VOXELS_ALIVE = "world:nbAlive";
// world fields
const string VOXEL_FIELD_HP = "0";
const string VOXEL_FIELD_COINS = "1";
const string VOXEL_FIELD_HP_TO_ADD = "2";
const string VOXEL_FIELD_ENEMY = "3";
const string VOXEL_FIELD_NFT = "4";
const string VOXEL_FIELD_TYPE = "5";

// player fields
const string PLAYER_FIELD_IS_CONNECTED = "isConnected";
const string PLAYER_FIELD_SERVER_ID = "serverId";
const string PLAYER_FIELD_USERNAME = "username";
const string PLAYER_FIELD_DAMAGE = "damage";
const string PLAYER_FIELD_COINS_MULTIPLIER = "multiplier";
const string PLAYER_FIELD_MAX_HP = "maxHP";
const string PLAYER_FIELD_HP = "hp";
const string PLAYER_FIELD_CRITICAL_HIT = "criticalHit";
const string PLAYER_FIELD_SKIN_ID = "skin";
// player fields values
const string PLAYER_FIELD_IS_CONNECTED_TRUE = "1";
const string PLAYER_FIELD_IS_CONNECTED_FALSE = "0";
const string PLAYER_FIELD_SERVER_ID_NONE = "-1";

// servers keys
const string SERVERS_KEY = "servers";
const string SERVERS_QUEUE_KEY = "servers:queue";

// viewers keys
const string VIEWERS_KEY = "viewers";

// players key
const string PLAYERS_QUEUE_KEY = "players:queue";
