package game

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type GameDB struct {
	EnvFile map[string]string
	Client  *redis.Client
}

// NewCache returns a new game database
func NewGameDB(envFile map[string]string) (*GameDB, error) {
	// open a new connection to redis
	var addr string
	if envFile["GAME_DB_NETWORK"] == "tcp" {
		addr = fmt.Sprintf(
			"%s:%s",
			envFile["GAME_DB_HOST"],
			envFile["GAME_DB_PORT"],
		)
	} else {
		addr = envFile["GAME_DB_SOCKET"]
	}
	db_num, err := strconv.Atoi(envFile["GAME_DB_DB"])
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(&redis.Options{
		Network:  envFile["GAME_DB_NETWORK"],
		Addr:     addr,
		Password: envFile["GAME_DB_PASSWORD"],
		DB:       db_num,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err = client.Ping(ctx).Err()
	if err != nil {
		return nil, err
	}
	return &GameDB{
		EnvFile: envFile,
		Client:  client,
	}, nil
}
