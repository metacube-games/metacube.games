package game

import (
	"backend/internal/constants"
	"bytes"
	"context"
	"fmt"
	"strconv"
	"time"
)

type Player struct {
	PublicKey   string
	IsConnected int
	ServerId    int
	Username    string
	Damage      int
	Multiplier  int
	HP          int
	MaxHP       int
	CriticalHit int
	SkinId      int
}

// InsertPlayerData inserts a new player into the database
func (gameDB *GameDB) InsertPlayerData(
	ctx context.Context,
	player *Player,
) error {
	return gameDB.Client.HSet(
		ctx,
		player.PublicKey,
		"isConnected", player.IsConnected,
		"serverId", player.ServerId,
		"username", player.Username,
		"damage", player.Damage,
		"multiplier", player.Multiplier,
		"hp", player.HP,
		"maxHP", player.MaxHP,
		"criticalHit", player.CriticalHit,
		"skin", player.SkinId,
	).Err()
}

// UpdatePlayerData updates the player data in the database
func (gameDB *GameDB) UpdatePlayerData(
	ctx context.Context,
	publicKey string,
	playerData map[string]any,
) error {
	return gameDB.Client.HSet(ctx, publicKey, playerData).Err()
}

// GetPlayerIsConnected returns the player isConnected value
func (gameDB *GameDB) GetPlayerIsConnected(
	ctx context.Context,
	publicKey string,
) (int, error) {
	isConnected, err := gameDB.Client.HGet(
		ctx,
		publicKey,
		"isConnected",
	).Result()
	if err != nil {
		return 0, err
	}
	return strconv.Atoi(isConnected)
}

// RemovePlayerData removes a player from the database
func (gameDB *GameDB) RemovePlayerData(
	ctx context.Context,
	publicKey string,
) error {
	return gameDB.Client.Del(ctx, publicKey).Err()
}

// GetServersStatus returns the number of players of all servers
func (gameDB *GameDB) GetServersPlayersCounts(
	ctx context.Context,
) ([]int, error) {
	// get all counts
	serversPlayersCounts, err := gameDB.Client.HGetAll(ctx, "servers").Result()
	if err != nil {
		return nil, err
	}
	// convert the servers status to an array of int
	serversPlayersCountsArray := make([]int, len(serversPlayersCounts))
	for serverId, playersCount := range serversPlayersCounts {
		index, _ := strconv.Atoi(serverId)
		serversPlayersCountsArray[index], _ = strconv.Atoi(playersCount)
	}
	return serversPlayersCountsArray, nil
}

// GetGameServersStatus returns the status of all servers
func (gameDB *GameDB) GetGameServersStatus(
	ctx context.Context,
) (string, error) {
	return gameDB.Client.Get(ctx, "servers:status").Result()
}

// SetGameServersStatus sets the status of all servers
func (gameDB *GameDB) SetGameServersStatus(
	ctx context.Context,
	status string,
) error {
	return gameDB.Client.Set(ctx, "servers:status", status, 0).Err()
}

// AddPlayerToQueue adds a player to the game queue
func (gameDB *GameDB) AddPlayerToQueue(
	ctx context.Context,
	publicKey string,
) (int64, error) {
	pos, err := gameDB.Client.RPush(ctx, "players:queue", publicKey).Result()
	if err != nil {
		return 0, err
	}
	return pos, nil
}

// RemovePlayerFromQueue removes a player from the game queue
func (gameDB *GameDB) RemovePlayerFromQueue(
	ctx context.Context,
	publicKey string,
) error {
	return gameDB.Client.LRem(ctx, "players:queue", 0, publicKey).Err()
}

// PublishKickPlayer publishes a kick player message
func (gameDB *GameDB) PublishKickPlayer(
	ctx context.Context,
	publicKey string,
) error {
	message := bytes.Buffer{}
	message.WriteString(publicKey)
	// publish the message
	return gameDB.Client.Publish(
		ctx,
		constants.RedisChannelKickPlayer,
		message.String(),
	).Err()
}

// GetNextPlayerInQueue gets the next server in the queue
func (gameDB *GameDB) GetNextServerInQueue(
	ctx context.Context,
) (string, error) {
	return gameDB.Client.LPop(ctx, "servers:queue").Result()
}

// RestoreServerToQueue pushes a server back to the head of the queue.
func (gameDB *GameDB) RestoreServerToQueue(
	ctx context.Context,
	serverIdStr string,
) error {
	return gameDB.Client.LPush(ctx, "servers:queue", serverIdStr).Err()
}

// GetNextPlayerInQueue gets the next player in the queue
func (gameDB *GameDB) GetNextPlayerInQueue(
	ctx context.Context,
) (string, error) {
	return gameDB.Client.LPop(ctx, "players:queue").Result()
}

// OpenServers sets the servers status to open
func (gameDB *GameDB) OpenServers(
	ctx context.Context,
) error {
	return gameDB.Client.Set(ctx, "servers:status", "open", 0).Err()
}

// AssignPlayerToServer assigns a player to a server
func (gameDB *GameDB) AssignPlayerToServer(
	ctx context.Context,
	playerPublicKey string,
	serverId int,
) error {
	return gameDB.Client.HSet(
		ctx,
		playerPublicKey,
		"serverId", serverId,
	).Err()
}

// DecrNbVoxelsAlive decrements the number of alive voxels
func (gameDB *GameDB) DecrNbVoxelsAlive(
	ctx context.Context,
) error {
	return gameDB.Client.Decr(ctx, "world:nbAlive").Err()
}

// SetNbVoxelsAlive sets the number of alive voxels
func (gameDB *GameDB) SetNbVoxelsAlive(
	ctx context.Context,
	nbVoxelsAlive int64,
) error {
	return gameDB.Client.Set(ctx, "world:nbAlive", nbVoxelsAlive, 0).Err()
}

// IncrNbVoxelsDead increments the number of dead voxels
func (gameDB *GameDB) IncrNbVoxelsDead(
	ctx context.Context,
) (int64, error) {
	return gameDB.Client.Incr(ctx, "world:nbDead").Result()
}

// SetNbVoxelsDead sets the number of dead voxels
func (gameDB *GameDB) SetNbVoxelsDead(
	ctx context.Context,
	nbVoxelsDead int64,
) error {
	return gameDB.Client.Set(ctx, "world:nbDead", nbVoxelsDead, 0).Err()
}

// UpdateLayerInfo updates the layer in the database
func (gameDB *GameDB) UpdateLayerInfo(
	ctx context.Context,
	layerIndex int,
) (bool, error) {
	// check if the layer was already updated
	layer, err := gameDB.Client.Get(ctx, "world:layer").Int()
	if err != nil {
		return false, err
	}
	if layer == layerIndex {
		return false, nil
	}
	err = gameDB.Client.Set(
		ctx,
		"world:layer",
		strconv.Itoa(layerIndex),
		0,
	).Err()
	if err != nil {
		return false, err
	}
	gameDB.Client.Set(
		ctx,
		"layer:timestamp",
		strconv.Itoa(int(time.Now().Unix())),
		0,
	)
	return true, nil
}

// GetCurrentLayer returns the current layer of the game
func (gameDB *GameDB) GetCurrentLayer(
	ctx context.Context,
) (int, error) {
	return gameDB.Client.Get(ctx, "world:layer").Int()
}

// GetLayerData returns the layer and the timestamp of the last layer update
// from the database
func (gameDB *GameDB) GetLayerInfo(
	ctx context.Context,
) (int, int64, error) {
	layer, err := gameDB.Client.Get(ctx, "world:layer").Int()
	if err != nil {
		return 0, 0, err
	}
	timestamp, err := gameDB.Client.Get(ctx, "layer:timestamp").Int64()
	if err != nil {
		return 0, 0, err
	}
	return layer, timestamp, nil
}

// SaveLayerLastPlayer saves the player that broke the last cube of the layer
func (gameDB *GameDB) SaveLayerLastPlayer(
	ctx context.Context,
	layerIndex int,
	publicKey string,
) error {
	return gameDB.Client.Set(
		ctx,
		fmt.Sprintf("layer:%d:lastPlayer", layerIndex),
		publicKey,
		0,
	).Err()
}

// PublishNewLayer publishes the new layer
func (gameDB *GameDB) PublishNewLayer(
	ctx context.Context,
	layerIndex int,
) error {
	message := bytes.Buffer{}
	message.WriteByte(byte(constants.ChangeLayerType))
	message.WriteByte(byte(layerIndex))
	// publish the message
	return gameDB.Client.Publish(
		ctx,
		constants.RedisChannelChangeLayer,
		message.String(),
	).Err()
}
