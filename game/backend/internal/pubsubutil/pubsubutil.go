package pubsubutil

import (
	"context"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	channelSize     = 10000
	depthAlertRatio = 0.8
	depthTickEvery  = 5 * time.Second
)

// Subscribe loops forever: subscribes, dispatches each message via handle,
// and reconnects with exponential backoff if the subscription dies.
// A background goroutine warns when the buffered channel passes 80% full.
func Subscribe(
	client *redis.Client,
	name string,
	handle func(*redis.Message),
	channels ...string,
) {
	backoffMs := 1000
	for {
		sub := client.Subscribe(context.Background(), channels...)
		ch := sub.Channel(redis.WithChannelSize(channelSize))
		done := make(chan struct{})
		go monitorDepth(name, ch, done)
		backoffMs = 1000
		for msg := range ch {
			handle(msg)
		}
		close(done)
		_ = sub.Close()
		slog.Error("pubsub disconnected, reconnecting",
			"subscriber", name, "backoffMs", backoffMs)
		time.Sleep(time.Duration(backoffMs) * time.Millisecond)
		if backoffMs < 30000 {
			backoffMs *= 2
		}
	}
}

func monitorDepth(name string, ch <-chan *redis.Message, done <-chan struct{}) {
	t := time.NewTicker(depthTickEvery)
	defer t.Stop()
	threshold := int(channelSize * depthAlertRatio)
	for {
		select {
		case <-done:
			return
		case <-t.C:
			if n := len(ch); n >= threshold {
				slog.Warn("pubsub channel near capacity",
					"subscriber", name,
					"depth", n,
					"capacity", channelSize,
				)
			}
		}
	}
}
