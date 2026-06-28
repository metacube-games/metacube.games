package controller

import (
	"backend/blockchain"
	"backend/cache"
	"backend/databases/data"
	"backend/databases/game"
	"log/slog"
	"os"
	"strconv"
	"sync"
)

type Controller struct {
	EnvFile                         map[string]string
	Cache                           *cache.Cache
	GameDB                          *game.GameDB
	GameDBServersPlayersCountsMutex sync.Mutex
	MainDB                          *data.MainDB
	AchievementsChan                chan []byte
	StarknetController              *blockchain.StarknetController
	MAX_PLAYERS_PER_GAME_SERVER     int
	Inter                           bool
}

// NewController creates a new controller with all the databases
func NewController(envFile map[string]string, inter bool) *Controller {
	c, err := cache.NewCache(envFile)
	if err != nil {
		slog.Error("cache init failed", "err", err)
		os.Exit(1)
	}
	var g *game.GameDB
	if !inter {
		g, err = game.NewGameDB(envFile)
		if err != nil {
			slog.Error("game db init failed", "err", err)
			os.Exit(1)
		}
	}
	m, err := data.NewMainDB(envFile)
	if err != nil {
		slog.Error("main db init failed", "err", err)
		os.Exit(1)
	}
	s, err := blockchain.NewStarknetController(envFile)
	if err != nil {
		slog.Error("starknet controller init failed", "err", err)
		os.Exit(1)
	}
	achievementsChan := make(chan []byte, 10000)
	maxPlayersPerGameServer, err := strconv.Atoi(
		envFile["MAX_PLAYERS_PER_GAME_SERVER"],
	)
	if err != nil {
		slog.Error("MAX_PLAYERS_PER_GAME_SERVER missing or invalid",
			"value", envFile["MAX_PLAYERS_PER_GAME_SERVER"],
			"err", err,
		)
		os.Exit(1)
	}
	return &Controller{
		EnvFile:                     envFile,
		Cache:                       c,
		GameDB:                      g,
		MainDB:                      m,
		StarknetController:          s,
		AchievementsChan:            achievementsChan,
		MAX_PLAYERS_PER_GAME_SERVER: maxPlayersPerGameServer,
		Inter:                       inter,
	}
}
