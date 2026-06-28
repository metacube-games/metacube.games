#include "App.h"
#include "common.h"
#include "message_builders.h"
#include <sw/redis++/redis++.h>
#include <thread>
#include <fstream>
#include <iostream>
#include <chrono>

using namespace std;
using namespace sw::redis;

// error status
const bool NO_ERROR = false;
const bool ERROR = true;

// socket app
uWS::App *app = nullptr;
uWS::Loop *loop = nullptr;

typedef struct ViewerData
{
    bool isConnected;
    string publicKeyStr;
} ViewerData;

// sockets hash map
unordered_map<string, uWS::WebSocket<false, true, ViewerData> *> sockets;

// database
Redis *redis = nullptr;

// received message
uint8_t *msg = new uint8_t[ClientMessage::MAX_LENGTH];

// thread functions declarations
void redisEventLoopThread();
void redisRareEventLoopThread();

// function declarations
void load_env_variables(const std::string &filename);

/**
 * @brief handle a new socket connection
 *
 * @param ws the socket
 * @return true if there is an error
 * @return false otherwise
 */
bool onOpenHandler(auto *ws)
{

    ws->subscribe(WS_CHANNEL);

    // the viewer is not connected yet
    ViewerData *viewer = (ViewerData *)ws->getUserData();
    viewer->isConnected = false;

    // update the number of viewers
    redis->incr(VIEWERS_KEY);
    redis->publish(REDIS_CHANNEL_CONTROL_CENTER, "");

    cout << "New viewer connected" << endl;

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
bool onMessageHandler([[maybe_unused]] auto *ws, string_view message)
{

    ViewerData *viewer = (ViewerData *)ws->getUserData();

    const size_t msgLength = message.size();
    if (msgLength > ClientMessage::MAX_LENGTH)
    {
        cout << "Message too long" << endl;
        return ERROR;
    }

    // copy the message in the uint8_t array
    memcpy(msg, string(message).c_str(), msgLength);

    // get the message type
    uint8_t msgType = msg[TYPE_INDEX];
    if (msgType >= ClientMessage::COUNT)
    {
        cout << "Invalid message type" << endl;
        return ERROR;
    }

    if (msgType == ClientMessage::CONNECT_TYPE)
    {
        if (msgLength != ClientMessage::CONNECT_LENGTH)
            return ERROR;

        viewer->isConnected = true;

        // save the public key
        viewer->publicKeyStr = string((const char *)msg + TYPE_BS, PUBLIC_KEY_BS);

        // add the player to the sockets hash map
        sockets[viewer->publicKeyStr] = ws;
    }
    else if (msgType == ClientMessage::LEAVE_QUEUE_TYPE)
    {
        if (msgLength != ClientMessage::LEAVE_QUEUE_LENGTH)
            return ERROR;

        redis->publish(REDIS_CHANNEL_VIEW_SERVERS, leaveQueueMessageBuilder(msg + TYPE_BS));
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
void onCloseHandler([[maybe_unused]] auto *ws, int code, string_view message)
{

    ViewerData *viewer = (ViewerData *)ws->getUserData();

    if (viewer->isConnected)
    {
        // retrieve the position of the viewer in the game queue
        auto res = reply::parse<OptionalLongLong>(*(redis->command("lpos", PLAYERS_QUEUE_KEY, viewer->publicKeyStr)));
        if (res)
        {
            // remove the player from the game queue
            redis->lrem(PLAYERS_QUEUE_KEY, 0, viewer->publicKeyStr);
            // inform the viewers that he has been removed from the queue
            uint16_t pos = (uint16_t)(*res + 1);

            redis->publish(REDIS_CHANNEL_VIEW_SERVERS, leaveQueueMessageBuilder((uint8_t *)&pos));
        }
        // remove the player from the sockets hash map
        sockets.erase(viewer->publicKeyStr);
    }

    // update the number of viewers
    redis->decr(VIEWERS_KEY);
    redis->publish(REDIS_CHANNEL_CONTROL_CENTER, "");

    cout << "Viewer disconnected with message: \"" << message << "\" and code: " << code << endl;
}

/**
 * @brief listen to Redis events
 *
 * @param sub the Redis subscriber
 */
void redisEventLoopThread()
{
    auto onMessage = []([[maybe_unused]] string channel, string message)
    { loop->defer([message]()
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
            sub.subscribe(REDIS_CHANNEL_VIEW_SERVERS);
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
            cerr << "[view] redis subscriber error: " << err.what()
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
                                        std::unordered_map<std::string, uWS::WebSocket<false, true, ViewerData> *>::iterator it = sockets.find(publicKey);
                                        if (it != sockets.end()) {
                                            it->second->send(message, uWS::OpCode::BINARY);
                                        }
                                    } }); };

    int backoffMs = 1000;
    while (true)
    {
        try
        {
            Subscriber sub = redis->subscriber();
            sub.on_message(onMessage);
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
            cerr << "[view] redis rare subscriber error: " << err.what()
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
        cerr << "Usage: ./view <env file path>" << endl;
        return 1;
    }

    load_env_variables(argv[1]);

    int port = atoi(getenv("VIEW_SERVER_PORT"));
    // string sslPrivateKeyPath = std::string(getenv("SSL_KEY_FILE"));
    // string sslCertificatePath = std::string(getenv("SSL_CRT_FILE"));

    // uWS::SocketContextOptions uWSoptions;
    // uWSoptions.key_file_name = sslPrivateKeyPath.c_str();
    // uWSoptions.cert_file_name = sslCertificatePath.c_str();
    // app = new uWS::SSLApp(uWSoptions);
    app = new uWS::App();
    loop = uWS::Loop::get();

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

    thread redisThread(redisEventLoopThread);
    thread redisRareThread(redisRareEventLoopThread);

    app->ws<ViewerData>("/*", {.open = [](auto *ws)
                               {
            if (onOpenHandler(ws)) ws->end(); },
                               .message = [](auto *ws, string_view message, [[maybe_unused]] uWS::OpCode opCode)
                               {
            if (onMessageHandler(ws, message)) ws->end(); },
                               .close = [](auto *ws, int code, string_view message)
                               { onCloseHandler(ws, code, message); }})
        .listen(port, [port](auto *listen_socket)
                {
        if (listen_socket) {
            cout << "Listening on port " << port << endl;
        } })
        .run();
}
