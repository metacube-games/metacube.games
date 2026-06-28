#include "App.h"
#include "common.h"
#include "world.h"
#include "player.h"
#include "message_builders.h"
#include "src/bomb/bomb.h"
#include <sw/redis++/redis++.h>
#include <thread>
#include <chrono>
#include <mutex>
#include <fstream>
#include <vector>
#include <iostream>

using namespace std;
using namespace sw::redis;

// error status
const bool NO_ERROR = false;
const bool ERROR = true;

// server id
uint8_t serverId;
string serverIdStr;

// socket app
uWS::App *app = nullptr;
uWS::Loop *loop = nullptr;

// sockets hash map
unordered_map<string, uWS::WebSocket<false, true, PlayerData> *> sockets;

// database - Redis client with connection pool for better concurrency handling
// Using Redis object with pool options (thread-safe, manages pool internally)
Redis *redisPool = nullptr;
// Dedicated redis connection for pub/sub (pub/sub requires separate connection)
Redis *redis = nullptr;

// world
World *world = nullptr;

// players positions
uint8_t *playersPositionsBuffer = new uint8_t[MAX_PLAYERS * (PLAYER_ID_BS + PLAYER_POSITION_BS) + TYPE_BS];
size_t currBufferEndOffset = 1;
// mutex protecting the players positions buffer and current buffer end offset
mutex playersPositionsBufferMutex;

// pending bomb explosions (ordered by explodeAt)
vector<PendingBomb> pendingBombs;
mutex pendingBombsMutex;

// received message
uint8_t *msg = new uint8_t[ClientMessage::MAX_LENGTH];

// thread functions declarations
void redisEventLoopThread();
void redisRareEventLoopThread();
void messageTimerThread(unsigned int interval);
void bombTimerThread();

// function declarations
bool onOpenHandler(uWS::WebSocket<false, true, PlayerData> *ws);
bool onMessageHandler(uWS::WebSocket<false, true, PlayerData> *ws, string_view message);
void onCloseHandler(uWS::WebSocket<false, true, PlayerData> *ws, int code, string_view message);
void load_env_variables(const std::string &filename);

/**
 * @brief handle a new socket connection
 *
 * @param ws the socket
 * @return true if there is an error
 * @return false otherwise
 */
bool onOpenHandler(uWS::WebSocket<false, true, PlayerData> *ws)
{

    ws->subscribe(WS_CHANNEL);

    // the player is not verified yet
    PlayerData *player = (PlayerData *)ws->getUserData();
    player->isVerified = false;

    return NO_ERROR;
}

/**
 * @brief handle the message of a socket
 *
 * @param ws the socket
 * @param message the message
 * @return true if there is an error
 * @return false otherwise
 */
bool onMessageHandler(uWS::WebSocket<false, true, PlayerData> *ws, string_view message)
{

    PlayerData *player = (PlayerData *)ws->getUserData();

    const size_t msgLength = message.size();
    if (msgLength > ClientMessage::MAX_LENGTH)
    {
        cout << "message too long" << endl;
        return ERROR;
    }

    // copy the message in the uint8_t array
    memcpy(msg, string(message).c_str(), msgLength);

    // get the message type
    uint8_t msgType = msg[TYPE_INDEX];

    // Validate message type is one we handle (valid types: 0 to COUNT-1)
    if (msgType >= ClientMessage::COUNT)
        return ERROR; // invalid message type

    if (player->isVerified)
    {
        //==============================================================================
        // MOVE MESSAGE
        //==============================================================================
        if (msgType == ClientMessage::MOVE_TYPE)
        {
            if (msgLength != ClientMessage::MOVE_LENGTH)
                return ERROR; // invalid message length

            if (updatePlayerPosition(player, playersPositionsBuffer, currBufferEndOffset, playersPositionsBufferMutex, msg + TYPE_BS))
                return ERROR; // error while updating player position
        }
        //==============================================================================
        // HIT VOXEL MESSAGE
        //==============================================================================
        else if (msgType == ClientMessage::HIT_VOXEL_TYPE)
        {
            if (msgLength != ClientMessage::HIT_VOXEL_LENGTH)
                return ERROR; // invalid message length

            uint64_t timestamp = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();

            int damage = player->damage;
            bool isCriticalHit = false;
            if (computeDamage(player, timestamp, damage, isCriticalHit))
                return ERROR; // error while computing damage

            bool voxelState = ALIVE;
            voxelHP_t voxelHP = 0;

            voxelCoins_t coinsEarned = 0;
            playerHP_t hpEarned = 0;
            voxelEnemy_t enemy = 0;
            voxelNFT_t nft = 0;
            voxelType_t type = 0;

            if (world->hitVoxel(redisPool, msg + TYPE_BS, damage, voxelState, voxelHP, coinsEarned, hpEarned, enemy, nft, type))
                return ERROR; // error while hitting voxel

            if (voxelState == DEAD)
            {
                // the multiplier is the percentage to add to the coins earned
                coinsEarned = static_cast<voxelCoins_t>(coinsEarned * player->coinsMultiplier);
                // compute the new player's hp
                player->hp = (playerHP_t)min((int)player->maxHP, (int)(player->hp + hpEarned));

                // Use pooled Redis client for database operations (thread-safe)
                try
                {
                    redisPool->hset(player->publicKeyStr, PLAYER_FIELD_HP, to_string(static_cast<unsigned int>(player->hp)));
                    redisPool->publish(REDIS_CHANNEL_BROADCAST, voxelDestroyedMessageBuilder(player->id, msg + TYPE_BS, coinsEarned, player->hp, enemy, nft));
                    redisPool->publish(REDIS_CHANNEL_DB_MANAGER, dbManagerVoxelDestroyedMessageBuilder(player->publicKey, coinsEarned, player->hp, nft, type));
                }
                catch (const sw::redis::Error &err)
                {
                    std::cerr << "[REDIS ERROR] Failed Redis operation for voxel destroyed: " << err.what() << std::endl;
                    return ERROR;
                }
            }

            // TODO [EXPERIMENTAL]
            if (updateClickTimestamp(player, timestamp))
                return ERROR; // potential cheating

            ws->send(voxelHPMessageBuilder(voxelHP, isCriticalHit ? ServerMessage::VOXEL_HP_CRITICAL_HIT_TYPE : ServerMessage::VOXEL_HP_HIT_TYPE, msg + TYPE_BS), uWS::OpCode::BINARY);
        }
        //==============================================================================
        // GET HP MESSAGE
        //==============================================================================
        else if (msgType == ClientMessage::GET_HP_TYPE)
        {
            if (msgLength != ClientMessage::GET_HP_LENGTH)
                return ERROR; // invalid message length

            voxelHP_t voxelHP = 0;

            if (world->getHP(redisPool, msg + TYPE_BS, voxelHP))
                return ERROR; // error while getting voxel HP

            ws->send(voxelHPMessageBuilder(voxelHP, ServerMessage::VOXEL_HP_TYPE, msg + TYPE_BS), uWS::OpCode::BINARY);
        }
        //==============================================================================
        // HIT PLAYER MESSAGE
        //==============================================================================
        else if (msgType == ClientMessage::HIT_PLAYER_TYPE)
        {
            if (msgLength != ClientMessage::HIT_PLAYER_LENGTH)
                return ERROR; // invalid message length

            playerID_t playerID = *(playerID_t *)(msg + TYPE_BS + PLAYER_COORDINATE_BS * 3);

            // Use pooled Redis client for publish operation (thread-safe)
            try
            {
                redisPool->publish(REDIS_CHANNEL_BROADCAST, playerHitMessageBuilder(msg + TYPE_BS, playerID, static_cast<uint8_t>(player->damage)));
            }
            catch (const sw::redis::Error &err)
            {
                std::cerr << "[REDIS ERROR] Failed Redis operation for player hit: " << err.what() << std::endl;
                return ERROR;
            }
        }
        //==============================================================================
        // ATTACK MESSAGE
        //==============================================================================
        else if (msgType == ClientMessage::ATTACK_TYPE)
        {
            if (msgLength != ClientMessage::ATTACK_LENGTH)
                return ERROR; // invalid message length

            voxelCoins_t coinsLost = 0;

            if (attackPlayer(player, *(msg + TYPE_BS), &coinsLost))
                return ERROR; // error while attacking player

            // Use pooled Redis client for database operations (thread-safe)
            try
            {
                redisPool->hset(player->publicKeyStr, PLAYER_FIELD_HP, to_string(static_cast<unsigned int>(player->hp)));
                redisPool->publish(REDIS_CHANNEL_DB_MANAGER, dbManagerAttackMessageBuilder(player->publicKey, coinsLost, player->hp, *(msg + TYPE_BS)));

                if (player->hp == 0)
                {
                    redisPool->publish(REDIS_CHANNEL_BROADCAST, deadPlayerMessageBuilder(player->id, *(msg + TYPE_BS)));
                    // close the socket
                    ws->end(DEAD_END_CODE, "");
                }
            }
            catch (const sw::redis::Error &err)
            {
                std::cerr << "[REDIS ERROR] Failed Redis operation for attack player: " << err.what() << std::endl;
                return ERROR;
            }
        }
        //==============================================================================
        // UPDATE INFO MESSAGE
        //==============================================================================
        else if (msgType == ClientMessage::UPDATE_INFO_TYPE)
        {
            if (msgLength != ClientMessage::UPDATE_INFO_LENGTH)
                return ERROR; // invalid message length

            // retrieve player's information from redis using connection pool
            unordered_map<string, string> playerInfo;
            try
            {
                redisPool->hgetall(player->publicKeyStr, inserter(playerInfo, playerInfo.begin()));
            }
            catch (const sw::redis::Error &err)
            {
                std::cerr << "[REDIS ERROR] Failed Redis operation for update info (hgetall): " << err.what() << std::endl;
                return ERROR;
            }

            const uint8_t oldSkinId = player->skinId;

            // update player's information
            if (readPlayerInfo(player, playerInfo))
                return ERROR; // error while reading player info

            if (oldSkinId != player->skinId)
            {
                try
                {
                    redisPool->publish(REDIS_CHANNEL_BROADCAST, playerUpdatedSkinMessageBuilder(player->id, player->skinId));
                }
                catch (const sw::redis::Error &err)
                {
                    std::cerr << "[REDIS ERROR] Failed Redis operation for update info (publish): " << err.what() << std::endl;
                    return ERROR;
                }
            }
        }
        //==============================================================================
        // PLACE BOMB MESSAGE
        //==============================================================================
        else if (msgType == ClientMessage::PLACE_BOMB_TYPE)
        {
            if (msgLength != ClientMessage::PLACE_BOMB_LENGTH)
                return ERROR; // invalid message length

            if (player->bombActive)
                return NO_ERROR;

            bombCoordinate_t bombX = *(bombCoordinate_t *)(msg + TYPE_BS);
            bombCoordinate_t bombY = *(bombCoordinate_t *)(msg + TYPE_BS + BOMB_COORDINATE_BS);
            bombCoordinate_t bombZ = *(bombCoordinate_t *)(msg + TYPE_BS + BOMB_COORDINATE_BS * 2);
            bombType_t bombType = msg[TYPE_BS + BOMB_ALL_COORDINATES_BS];

            if (bombType < 1 || bombType >= NB_BOMB_TYPES)
                return NO_ERROR;

            player->bombX = bombX;
            player->bombY = bombY;
            player->bombZ = bombZ;
            player->bombType = bombType;
            player->bombActive = true;
            uint64_t timestamp = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
            player->lastBombTime = timestamp;

            try
            {
                redisPool->publish(REDIS_CHANNEL_BROADCAST, bombPlacedMessageBuilder(player->id, bombX, bombY, bombZ, bombType));
            }
            catch (const sw::redis::Error &err)
            {
                cerr << "[REDIS ERROR] Failed Redis operation for place bomb: " << err.what() << endl;
                player->bombActive = false;
                return NO_ERROR;
            }

            // a copy is needed in case the player gets disconnected before the bomb explodes
            PendingBomb pending;

            pending.id = player->id;
            memcpy(pending.publicKey, player->publicKey, PUBLIC_KEY_BS);
            pending.publicKeyStr = player->publicKeyStr;
            pending.hp = player->hp;
            pending.maxHP = player->maxHP;
            pending.damage = player->damage;
            pending.coinsMultiplier = player->coinsMultiplier;
            pending.bombType = bombType;
            pending.bombX = bombX;
            pending.bombY = bombY;
            pending.bombZ = bombZ;
            pending.explodeAt = timestamp + 2500;
            pendingBombsMutex.lock();
            pendingBombs.push_back(std::move(pending));
            pendingBombsMutex.unlock();
        }
        //==============================================================================
        // INVALID MESSAGE
        //==============================================================================
        else
        {
            return ERROR; // invalid message type
        }
    }
    else
    {
        //==============================================================================
        // CONNECT MESSAGE
        //==============================================================================
        if (msgType == ClientMessage::CONNECT_TYPE)
        {
            if (msgLength != ClientMessage::CONNECT_LENGTH)
                return ERROR; // invalid message length

            string username;
            uint8_t usernameLength = 0;
            uint8_t *position = new uint8_t[PLAYER_POSITION_BS];

            if (initPlayer(redisPool, player, playersPositionsBuffer, currBufferEndOffset, playersPositionsBufferMutex, msg + TYPE_BS, serverIdStr, username, usernameLength, position))
                return ERROR; // error while initializing player

            // add the player to the sockets hash map
            sockets[player->publicKeyStr] = ws;

            cout << "New player connected: " << player->id << endl;

            ws->send(authenticationMessageBuilder(player->id, position), uWS::OpCode::BINARY);

            delete[] position; // Use delete[] for arrays allocated with new[]

            // Use pooled Redis client for publish operation (thread-safe)
            try
            {

                redisPool->publish(REDIS_CHANNEL_BROADCAST, playerConnectedMessageBuilder(player->id, player->skinId, username, usernameLength));
            }
            catch (const sw::redis::Error &err)
            {
                std::cerr << "[REDIS ERROR] Failed Redis operation for player connected: " << err.what() << std::endl;
                return ERROR;
            }
        }
        //==============================================================================
        // INVALID MESSAGE
        //==============================================================================
        else
        {
            return ERROR; // invalid message type
        }
    }

    return NO_ERROR;
}

/**
 * @brief handle the disconnection of a socket
 *
 * @param ws the socket
 * @param code the code
 * @param message the message
 * @param world the world instance
 */
void onCloseHandler(uWS::WebSocket<false, true, PlayerData> *ws, int code, string_view message)
{

    PlayerData *player = (PlayerData *)ws->getUserData();

    if (player->isVerified)
    {
        // remove the player from the sockets hash map
        sockets.erase(player->publicKeyStr);

        disconnectPlayer(redisPool, player, serverIdStr);

        // Use pooled Redis client for publish operation (thread-safe)
        try
        {

            redisPool->publish(REDIS_CHANNEL_PLAYER_DISCONNECTED, playerDisconnectedMessageBuilder(player->id));
        }
        catch (const sw::redis::Error &err)
        {
            std::cerr << "[REDIS ERROR] Failed Redis operation for player disconnected: " << err.what() << std::endl;
            // Don't return error here - player disconnect should continue even if publish fails
        }

        cout << "Player " << player->id << " disconnected with message: \"" << message << "\" and code: " << code << endl;
    }
}

/**
 * @brief poll for pending bomb detonations and dispatch
 */
void bombTimerThread()
{
    while (true)
    {
        this_thread::sleep_for(chrono::milliseconds(50));

        uint64_t timestamp = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();

        vector<PendingBomb> toExplode;
        pendingBombsMutex.lock();
        auto it = pendingBombs.begin();
        while (it != pendingBombs.end() && timestamp >= it->explodeAt)
        {
            toExplode.push_back(std::move(*it));
            ++it;
        }
        pendingBombs.erase(pendingBombs.begin(), it);
        pendingBombsMutex.unlock();

        for (const auto &bomb : toExplode)
            loop->defer([bomb]()
                        { explodeBomb(bomb); });
    }
}

/**
 * @brief listen to Redis events
 *
 * @param sub the Redis subscriber
 */
void redisEventLoopThread()
{
    auto onMessage = []([[maybe_unused]] string channel, string message)
    { loop->defer([channel, message]()
                  { app->publish(WS_CHANNEL, message, uWS::OpCode::BINARY); }); };

    int backoffMs = 1000;
    while (true)
    {
        try
        {
            Subscriber sub = redis->subscriber();
            sub.on_message(onMessage);
            sub.subscribe(REDIS_CHANNEL_BROADCAST);
            sub.subscribe(REDIS_CHANNEL_PLAYERS_POSITIONS);
            sub.subscribe(REDIS_CHANNEL_PLAYER_DISCONNECTED);
            backoffMs = 1000;
            while (true)
            {
                try
                {
                    sub.consume();
                }
                catch (const TimeoutError &)
                {
                    // no message ready in the non-blocking window; keep polling
                }
            }
        }
        catch (const Error &err)
        {
            cerr << "[game] redis subscriber error: " << err.what()
                 << ", reconnecting in " << backoffMs << "ms" << endl;
            this_thread::sleep_for(chrono::milliseconds(backoffMs));
            backoffMs = min(backoffMs * 2, 30000);
        }
    }
}

/**
 * @brief listen to Redis rare events
 *
 * @param sub the Redis subscriber
 */
void redisRareEventLoopThread()
{
    auto onMessage = []([[maybe_unused]] string channel, string message)
    { loop->defer([channel, message]()
                  {
                                    if (channel == REDIS_CHANNEL_ACHIEVEMENT_NOTIFICATION) {
                                        string publicKey = message.substr(1, PUBLIC_KEY_BS);
                                        // search for the player in the sockets hash map
                                        std::unordered_map<std::string, uWS::WebSocket<false, true, PlayerData> *>::iterator it = sockets.find(publicKey);
                                        if (it != sockets.end()) {
                                            it->second->send(message, uWS::OpCode::BINARY);
                                        }
                                    } else if (channel == REDIS_CHANNEL_KICK_PLAYER) {
                                        // search for the player in the sockets hash map
                                        std::unordered_map<std::string, uWS::WebSocket<false, true, PlayerData> *>::iterator it = sockets.find(message);
                                        if (it != sockets.end()) {
                                            it->second->end(KICK_END_CODE, "");
                                        }
                                    } else if (channel == REDIS_CHANNEL_CHANGE_LAYER) {
                                        // copy the message in the uint8_t array
                                        memcpy(msg, message.c_str(), ServerMessage::CHANGE_LAYER_LENGTH);
                                        // get the new layer
                                        uint8_t newLayer = msg[TYPE_BS];
                                        // change the layer data
                                        world->changeLayerData(ALL_LAYERS_DATA[newLayer]);
                                        // forward message to all players
                                        app->publish(WS_CHANNEL, message, uWS::OpCode::BINARY);
                                    } }); };

    int backoffMs = 1000;
    while (true)
    {
        try
        {
            Subscriber sub = redis->subscriber();
            sub.on_message(onMessage);
            sub.subscribe(REDIS_CHANNEL_KICK_PLAYER);
            sub.subscribe(REDIS_CHANNEL_CHANGE_LAYER);
            sub.subscribe(REDIS_CHANNEL_ACHIEVEMENT_NOTIFICATION);
            backoffMs = 1000;
            while (true)
            {
                try
                {
                    sub.consume();
                }
                catch (const TimeoutError &)
                {
                    // no message ready in the non-blocking window; keep polling
                }
            }
        }
        catch (const Error &err)
        {
            cerr << "[game] redis rare subscriber error: " << err.what()
                 << ", reconnecting in " << backoffMs << "ms" << endl;
            this_thread::sleep_for(chrono::milliseconds(backoffMs));
            backoffMs = min(backoffMs * 2, 30000);
        }
    }
}

/**
 * @brief publish all positions at a given interval
 *
 * @param interval time interval in milliseconds
 */
void messageTimerThread(unsigned int interval)
{

    // set message type
    playersPositionsBuffer[TYPE_INDEX] = ServerMessage::PLAYERS_POSITIONS_TYPE;

    string message;

    auto intervalChrono = chrono::milliseconds(interval);

    while (true)
    {
        auto next = chrono::steady_clock::now() + intervalChrono;
        // take the lock
        playersPositionsBufferMutex.lock();
        if (currBufferEndOffset != 1)
        {
            // create the message
            message = string((const char *)playersPositionsBuffer, currBufferEndOffset);
            // reset the buffer end position
            currBufferEndOffset = 1;
            // release the lock
            playersPositionsBufferMutex.unlock();
            // publish using pooled Redis client (thread-safe)
            try
            {

                redisPool->publish(REDIS_CHANNEL_PLAYERS_POSITIONS, message);
            }
            catch (const sw::redis::Error &err)
            {
                std::cerr << "[REDIS ERROR] Failed Redis operation for player positions: " << err.what() << std::endl;
                // Don't crash on position sync failure - just skip this update
            }
        }
        else
        {
            // release the lock
            playersPositionsBufferMutex.unlock();
        }
        // wait until the next interval
        this_thread::sleep_until(next);
    }
}

/**
 * @brief load environment variables from a file
 */
void load_env_variables(const std::string &filename)
{
    std::ifstream file(filename);

    if (!file.is_open())
    {
        cerr << "Error: could not open file " << filename << endl;
        exit(1);
    }

    std::string line;
    while (std::getline(file, line))
    {
        if (line.empty() || line[0] == '#')
        {
            continue;
        }
        size_t sep = line.find('=');
        if (sep != std::string::npos)
        {
            std::string key = line.substr(0, sep);
            std::string value = line.substr(sep + 1);
            if ((value.front() == '"' || value.front() == '\'') && value.front() == value.back())
            {
                value = value.substr(1, value.size() - 2);
            }
            setenv(key.c_str(), value.c_str(), 1);
        }
    }

    file.close();
}

int main(int argc, char *argv[])
{
    if (argc != 2)
    {
        cerr << "Usage: ./game <env file path>" << endl;
        return 1;
    }

    load_env_variables(argv[1]);

    int port = atoi(getenv("GAME_SERVER_PORT"));
    // string sslPrivateKeyPath = std::string(getenv("SSL_KEY_FILE"));
    // string sslCertificatePath = std::string(getenv("SSL_CRT_FILE"));
    serverId = (uint8_t)atoi(getenv("GAME_SERVER_ID"));
    serverIdStr = to_string((int)serverId);

    // uWS::SocketContextOptions uWSoptions;
    // uWSoptions.key_file_name = sslPrivateKeyPath.c_str();
    // uWSoptions.cert_file_name = sslCertificatePath.c_str();
    // app = new uWS::SSLApp(uWSoptions);
    app = new uWS::App();
    loop = uWS::Loop::get();

    // Configure Redis connection options
    ConnectionOptions options;
    options.password = std::string(getenv("GAME_DB_PASSWORD"));
    options.socket_timeout = std::chrono::milliseconds(500);   // Socket operation timeout
    options.connect_timeout = std::chrono::milliseconds(1000); // Connection establishment timeout
    std::string network = std::string(getenv("GAME_DB_NETWORK"));
    if (network.compare("tcp") == 0)
    {
        options.type = ConnectionType::TCP;
        options.host = std::string(getenv("GAME_DB_HOST"));
        options.port = atoi(getenv("GAME_DB_PORT"));
    }
    else
    {
        options.type = ConnectionType::UNIX;
        options.path = std::string(getenv("GAME_DB_SOCKET"));
    }

    // Configure connection pool options for high concurrency
    ConnectionPoolOptions poolOptions;
    poolOptions.size = 40;                                      // Pool size: 40 connections (handles burst loads like bomb explosions with 150 voxels)
    poolOptions.wait_timeout = std::chrono::milliseconds(250);  // Wait up to 250ms for available connection (increased for burst tolerance)
    poolOptions.connection_lifetime = std::chrono::minutes(10); // Recycle connections every 10 minutes
    poolOptions.connection_idle_time = std::chrono::minutes(2); // Close idle connections after 2 minutes

    // Create Redis client with connection pool (thread-safe, manages pool internally)
    redisPool = new Redis(options, poolOptions);

    // Create a single Redis instance for subscribers (Pub/Sub requires dedicated connection)
    redis = new Redis(options);

    size_t x = stoi(getenv("WORLD_SIZE_X"));
    size_t y = stoi(getenv("WORLD_SIZE_Y"));
    size_t z = stoi(getenv("WORLD_SIZE_Z"));
    size_t layer = 0;

    auto layer_ = redis->get(WORLD_KEY_LAYER);
    if (layer_)
    {
        layer = (uint8_t)stoi(*layer_);
    }
    else
    {
        cerr << "Error: could not get world layer from redis" << endl;
        return 1;
    }

    world = new World(x, y, z, ALL_LAYERS_DATA[layer]);
    cout << "World of size " << x << "x" << y << "x" << z << " initialized" << endl;

    initFreeIDs(serverId, MAX_PLAYERS);

    thread redisThread(redisEventLoopThread);
    thread redisRareThread(redisRareEventLoopThread);

    thread messageThread(messageTimerThread, 34);
    thread bombThread(bombTimerThread);

    app->ws<PlayerData>("/*", {.open = [](uWS::WebSocket<false, true, PlayerData> *ws)
                               {
            if (onOpenHandler(ws)) ws->end(); },
                               .message = [](uWS::WebSocket<false, true, PlayerData> *ws, string_view message, [[maybe_unused]] uWS::OpCode opCode)
                               {
            if (onMessageHandler(ws, message)) ws->end(); },
                               .close = [](uWS::WebSocket<false, true, PlayerData> *ws, int code, string_view message)
                               { onCloseHandler(ws, code, message); }})
        .listen(port, [port](auto *listen_socket)
                {
        if (listen_socket) {
            cout << "Listening on port " << port << endl;
            // set the server as operational
            redis->hset(SERVERS_KEY, serverIdStr, to_string(0));
        } })
        .run();
}
