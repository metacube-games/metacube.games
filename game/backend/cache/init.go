package cache

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type Cache struct {
	Client *redis.Client
}

// NewCache returns a new cache database
func NewCache(envFile map[string]string) (*Cache, error) {
	// open a new connection to the cache database
	var addr string
	if envFile["CACHE_DB_NETWORK"] == "tcp" {
		addr = fmt.Sprintf(
			"%s:%s",
			envFile["CACHE_DB_HOST"],
			envFile["CACHE_DB_PORT"],
		)
	} else {
		addr = envFile["CACHE_DB_SOCKET"]
	}
	db_num, err := strconv.Atoi(envFile["CACHE_DB_DB"])
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(&redis.Options{
		Network:  envFile["CACHE_DB_NETWORK"],
		Addr:     addr,
		Password: envFile["CACHE_DB_PASSWORD"],
		DB:       db_num,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err = client.Ping(ctx).Err()
	if err != nil {
		return nil, err
	}
	return &Cache{Client: client}, nil
}
