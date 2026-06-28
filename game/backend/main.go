package main

import (
	"backend/api"
	"backend/chat"
	"backend/queue"
	"backend/stats/manager"
	"log/slog"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

func main() {
	// JSON structured logging to stderr — container drivers can ingest as-is.
	slog.SetDefault(slog.New(slog.NewJSONHandler(
		os.Stderr,
		&slog.HandlerOptions{Level: slog.LevelInfo},
	)))

	if len(os.Args) != 2 {
		slog.Error("invalid usage", "expected", "./main <path to env file>")
		os.Exit(1)
	}
	envFile, err := godotenv.Read(os.Args[1])
	if err != nil {
		slog.Error("failed to read env file", "path", os.Args[1], "err", err)
		os.Exit(1)
	}
	INTER := os.Getenv("INTER")
	var inter bool
	switch strings.ToLower(INTER) {
	case "":
		inter = false
	case "true":
		inter = true
	case "false":
		inter = false
	default:
		slog.Error("invalid INTER value",
			"value", INTER,
			"expected", "true|false|empty",
		)
		os.Exit(1)
	}
	txChan, achievementsChan := api.InitAndStartAPI(envFile, inter)
	if !inter {
		manager.InitAndStartStatsManager(envFile, txChan, achievementsChan)
		queue.InitAndStartQueueManager(envFile)
		chat.InitAndStartChatServer(envFile)
	}
	select {}
}
