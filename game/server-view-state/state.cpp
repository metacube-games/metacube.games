#include "App.h"
#include "common.h"
#include <sw/redis++/redis++.h>
#include <mutex>
#include <fstream>
#include <iostream>
#include <thread>
#include <chrono>

using namespace std;
using namespace sw::redis;

// database
Redis *redis = nullptr;

// game state
uint8_t *gameStateBuffer = nullptr;
size_t gameStateBufferSize = 0;
// string form of game state sent to players
string gameStateStr;
// mutex for game state string
mutex gameStateStrMutex;

// world
int worldSizeX = 0;
int worldSizeY = 0;
int worldSizeZ = 0;
int nbVoxelsAlive = 0;
uint8_t worldLayer = 0;
const size_t WORLD_DATA_OFFSET = 17;

// usernames
size_t usernamesOffset = 0;

// maintenance
bool maintenance = false;

// thread functions declarations
void redisEventLoopThread();

// function declarations
void load_env_variables(const std::string &filename);

/**
 * @brief listen to Redis events
 *
 * @param sub the Redis subscriber
 */
void redisEventLoopThread()
{

    fstream worldDataFile("/world-data/worldData.bin", ios::binary | ios::in | ios::out);

    static uint8_t msg[ServerMessage::VOXEL_DESTROYED_LENGTH];

    auto onMessage = [&worldDataFile]([[maybe_unused]] string channel, string message)
    {
        const size_t msgLength = message.size();
        // copy the message in the uint8_t array
        memcpy(msg, string(message).c_str(), msgLength);
        // get the message type
        uint8_t msgType = msg[TYPE_INDEX];
        if (msgType == ServerMessage::VOXEL_DESTROYED_TYPE)
        {
            // retrieve the coordinates
            uint8_t *voxelCoordinates = msg + TYPE_BS + PLAYER_ID_BS;
            size_t x = (size_t)(*(voxelCoordinate_t *)(voxelCoordinates));
            size_t y = (size_t)(*(voxelCoordinate_t *)(voxelCoordinates + VOXEL_COORDINATE_BS));
            size_t z = (size_t)(*(voxelCoordinate_t *)(voxelCoordinates + VOXEL_COORDINATE_BS * 2));
            // update the world data and file
            gameStateBuffer[WORLD_DATA_OFFSET + x + y * worldSizeX + z * worldSizeX * worldSizeY] = 0;
            worldDataFile.seekp(x + y * worldSizeX + z * worldSizeX * worldSizeY);
            uint8_t zero = 0;
            worldDataFile.write((char *)&zero, 1);
            worldDataFile.flush();
            // update the number of voxels alive
            *(int *)(gameStateBuffer + 12) = --nbVoxelsAlive;
            // update the game state string
            gameStateStrMutex.lock();
            gameStateStr = string((const char *)gameStateBuffer, gameStateBufferSize);
            gameStateStrMutex.unlock();
        }
        else if (msgType == ServerMessage::PLAYER_DISCONNECTED_TYPE && !maintenance)
        {
            // retrieve the player ID
            playerID_t playerID = *(playerID_t *)(msg + TYPE_BS);
            // find the player in the game state
            size_t iterator = usernamesOffset;
            while (iterator < gameStateBufferSize)
            {
                // retrieve the username length
                uint8_t usernameLength = gameStateBuffer[iterator + PLAYER_ID_BS + PLAYER_SKIN_BS];
                // compare the player ID
                if (*(playerID_t *)(gameStateBuffer + iterator) == playerID)
                {
                    // remove the player from the game state
                    memmove(gameStateBuffer + iterator, gameStateBuffer + iterator + PLAYER_ID_BS + PLAYER_SKIN_BS + PLAYER_USERNAME_LENGTH_BS + usernameLength, gameStateBufferSize - iterator - PLAYER_ID_BS - PLAYER_SKIN_BS - PLAYER_USERNAME_LENGTH_BS - usernameLength);
                    gameStateBufferSize -= PLAYER_ID_BS + PLAYER_SKIN_BS + PLAYER_USERNAME_LENGTH_BS + usernameLength;
                    // update the game state string
                    gameStateStrMutex.lock();
                    gameStateStr = string((const char *)gameStateBuffer, gameStateBufferSize);
                    gameStateStrMutex.unlock();
                    break;
                }
                // move to the next player
                iterator += PLAYER_ID_BS + PLAYER_SKIN_BS + PLAYER_USERNAME_LENGTH_BS + usernameLength;
            }
        }
        else if (msgType == ServerMessage::PLAYER_CONNECTED_TYPE && !maintenance)
        {
            // add the new player to the game state
            memcpy(gameStateBuffer + gameStateBufferSize, msg + TYPE_BS, msgLength - TYPE_BS);
            gameStateBufferSize += msgLength - TYPE_BS;
            // update the game state string
            gameStateStrMutex.lock();
            gameStateStr = string((const char *)gameStateBuffer, gameStateBufferSize);
            gameStateStrMutex.unlock();
        }
        else if (msgType == ServerMessage::PLAYER_UPDATED_SKIN_TYPE && !maintenance)
        {
            // retrieve the player ID and new skin ID
            playerID_t playerID = *(playerID_t *)(msg + TYPE_BS);
            uint8_t newSkinID = msg[TYPE_BS + PLAYER_ID_BS];
            // find the player in the game state
            size_t iterator = usernamesOffset;
            while (iterator < gameStateBufferSize)
            {
                // retrieve the username length
                uint8_t usernameLength = gameStateBuffer[iterator + PLAYER_ID_BS + PLAYER_SKIN_BS];
                // compare the player ID
                if (*(playerID_t *)(gameStateBuffer + iterator) == playerID)
                {
                    // update the skin ID in the game state
                    gameStateBuffer[iterator + PLAYER_ID_BS] = newSkinID;
                    // update the game state string
                    gameStateStrMutex.lock();
                    gameStateStr = string((const char *)gameStateBuffer, gameStateBufferSize);
                    gameStateStrMutex.unlock();
                    break;
                }
                // move to the next player
                iterator += PLAYER_ID_BS + PLAYER_SKIN_BS + PLAYER_USERNAME_LENGTH_BS + usernameLength;
            }
        }
        else if (msgType == ServerMessage::CHANGE_LAYER_TYPE)
        {
            // retrieve the new layer
            *(gameStateBuffer + 16) = msg[TYPE_BS];
            // update the game state string
            gameStateStrMutex.lock();
            gameStateStr = string((const char *)gameStateBuffer, gameStateBufferSize);
            gameStateStrMutex.unlock();
        }
        else if (msgType == ServerMessage::START_MAINTENANCE_TYPE)
        {
            maintenance = true;
            // remove all player from the game state
            gameStateBufferSize = usernamesOffset;
            // update the game state string
            gameStateStrMutex.lock();
            gameStateStr = string((const char *)gameStateBuffer, gameStateBufferSize);
            gameStateStrMutex.unlock();
        }
        else if (msgType == ServerMessage::STOP_MAINTENANCE_TYPE)
        {
            maintenance = false;
        } };

    int backoffMs = 1000;
    while (true)
    {
        try
        {
            Subscriber sub = redis->subscriber();
            sub.on_message(onMessage);
            sub.subscribe(REDIS_CHANNEL_BROADCAST);
            sub.subscribe(REDIS_CHANNEL_PLAYER_DISCONNECTED);
            sub.subscribe(REDIS_CHANNEL_CHANGE_LAYER);
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
            cerr << "[state] redis subscriber error: " << err.what()
                 << ", reconnecting in " << backoffMs << "ms" << endl;
            this_thread::sleep_for(chrono::milliseconds(backoffMs));
            backoffMs = min(backoffMs * 2, 30000);
        }
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
        cerr << "Usage: ./state <env file path>" << endl;
        return 1;
    }

    load_env_variables(argv[1]);

    int port = atoi(getenv("STATE_SERVER_PORT"));

    // string sslPrivateKeyPath = std::string(getenv("SSL_KEY_FILE"));
    // string sslCertificatePath = std::string(getenv("SSL_CRT_FILE"));

    // uWS::SocketContextOptions uWSoptions;
    // uWSoptions.key_file_name = sslPrivateKeyPath.c_str();
    // uWSoptions.cert_file_name = sslCertificatePath.c_str();

    ConnectionOptions options;
    options.password = std::string(getenv("GAME_DB_PASSWORD"));
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
    redis = new Redis(options);

    worldSizeX = stoi(getenv("WORLD_SIZE_X"));
    worldSizeY = stoi(getenv("WORLD_SIZE_Y"));
    worldSizeZ = stoi(getenv("WORLD_SIZE_Z"));

    auto nbAlive = redis->get(WORLD_KEY_NB_VOXELS_ALIVE);
    auto layer = redis->get(WORLD_KEY_LAYER);
    if (nbAlive && layer)
    {
        nbVoxelsAlive = stoi(*nbAlive);
        worldLayer = (uint8_t)stoi(*layer);
    }
    else
    {
        cerr << "Error: could not get world layer and number of voxels alive from redis" << endl;
        return 1;
    }

    // initialize the game state buffer
    gameStateBufferSize = WORLD_DATA_OFFSET + worldSizeX * worldSizeY * worldSizeZ;
    gameStateBuffer = new uint8_t[gameStateBufferSize];

    // store world size in the buffer
    *(int *)gameStateBuffer = worldSizeX;
    *(int *)(gameStateBuffer + 4) = worldSizeY;
    *(int *)(gameStateBuffer + 8) = worldSizeZ;
    *(int *)(gameStateBuffer + 12) = nbVoxelsAlive;
    *(gameStateBuffer + 16) = worldLayer;

    // read world data file
    ifstream worldDataFile("/world-data/worldData.bin", ios::binary);
    // convert to uint8_t array
    worldDataFile.read((char *)gameStateBuffer + WORLD_DATA_OFFSET, worldSizeX * worldSizeY * worldSizeZ);
    worldDataFile.close();

    usernamesOffset = gameStateBufferSize;

    gameStateStr = string((const char *)gameStateBuffer, gameStateBufferSize);

    thread redisThread(redisEventLoopThread);

    std::string cors = std::string(getenv("GAME_CORS_ORIGIN"));

    const char *sslEnv = getenv("SSL");
    if (sslEnv != nullptr && strcmp(sslEnv, "true") == 0)
    {
        uWS::SocketContextOptions uWSoptions;
        uWSoptions.key_file_name = getenv("SSL_KEY_FILE");
        uWSoptions.cert_file_name = getenv("SSL_CRT_FILE");
        uWS::SSLApp(uWSoptions)
            .get("/game/init", [cors](auto *res, [[maybe_unused]] auto *req)
                 {
                    cout << "GET /game/init" << endl;
                    gameStateStrMutex.lock();
                    res->cork([res, cors]()
                            { res->writeHeader("Access-Control-Allow-Origin", cors)->end(gameStateStr); }); 
                    gameStateStrMutex.unlock(); 
                    cout << "Sent game state" << endl; })
            .listen(port, [port]([[maybe_unused]] auto *listen_socket)
                    { cout << "Listening on port " << port << endl; })
            .run();
    }
    else
    {
        uWS::App()
            .get("/game/init", [cors](auto *res, [[maybe_unused]] auto *req)
                 {
                    cout << "GET /game/init" << endl;
                    gameStateStrMutex.lock();
                    res->cork([res, cors]()
                            { res->end(gameStateStr); }); 
                    gameStateStrMutex.unlock(); 
                    cout << "Sent game state" << endl; })
            .listen(port, [port]([[maybe_unused]] auto *listen_socket)
                    { cout << "Listening on port " << port << endl; })
            .run();
    }
}
