package queue

import (
	"backend/databases/game"
	"backend/internal/constants"
	"backend/internal/pubsubutil"
	"bytes"
	"context"
	"log/slog"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type QueueManager struct {
	GameDB *game.GameDB
}

func (q *QueueManager) ListenForEvents() {
	pubsubutil.Subscribe(
		q.GameDB.Client, "queue",
		func(_ *redis.Message) { q.handlePlayerDisconnected() },
		constants.RedisChannelPlayerDisconnected,
	)
}

func (q *QueueManager) handlePlayerDisconnected() {
	ctx, cancel := context.WithTimeout(
		context.Background(), 5*time.Second)
	defer cancel()
	slog.Info("player disconnected")
	serverIdStr, err := q.GameDB.GetNextServerInQueue(ctx)
	if err != nil && err != redis.Nil {
		slog.Error("get next server", "err", err)
		return
	}
	if serverIdStr == "" {
		slog.Warn("no server available in queue")
		if err := q.GameDB.OpenServers(ctx); err != nil {
			slog.Error("open servers", "err", err)
		}
		return
	}
	serverId, err := strconv.Atoi(serverIdStr)
	if err != nil {
		slog.Error("parse server id", "err", err)
		if e := q.GameDB.RestoreServerToQueue(
			ctx, serverIdStr,
		); e != nil {
			slog.Error("restore server", "err", e)
		}
		return
	}
	playerPublicKey, err := q.GameDB.GetNextPlayerInQueue(ctx)
	if err != nil && err != redis.Nil {
		slog.Error("get next player", "err", err)
		if e := q.GameDB.RestoreServerToQueue(
			ctx, serverIdStr,
		); e != nil {
			slog.Error("restore server", "err", e)
		}
		return
	}
	if playerPublicKey == "" {
		slog.Info("no more players in queue")
		if e := q.GameDB.RestoreServerToQueue(
			ctx, serverIdStr,
		); e != nil {
			slog.Error("restore server", "err", e)
		}
		if err := q.GameDB.OpenServers(ctx); err != nil {
			slog.Error("open servers", "err", err)
		}
		return
	}
	slog.Info("assign player to server",
		"player", playerPublicKey,
		"server", serverIdStr,
	)
	if err := q.GameDB.AssignPlayerToServer(
		ctx, playerPublicKey, serverId,
	); err != nil {
		slog.Error("assign player", "err", err)
		if e := q.GameDB.RestoreServerToQueue(
			ctx, serverIdStr,
		); e != nil {
			slog.Error("restore server", "err", e)
		}
		return
	}
	message := bytes.Buffer{}
	message.WriteByte(byte(constants.NextPlayerType))
	message.WriteByte(byte(serverId))
	message.WriteString(playerPublicKey)
	q.GameDB.Client.Publish(
		ctx,
		constants.RedisChannelViewServers,
		message.String(),
	)
}

func InitAndStartQueueManager(envFile map[string]string) {
	g, err := game.NewGameDB(envFile)
	if err != nil {
		slog.Error("queue manager: game db init failed", "err", err)
		os.Exit(1)
	}

	queueManager := QueueManager{
		GameDB: g,
	}

	go queueManager.ListenForEvents()
}
