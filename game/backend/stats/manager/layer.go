package manager

import (
	"backend/stats/achievement"
	"context"
	"fmt"
	"log/slog"
	"time"
)

const LAYER_MESSAGE_LENGTH = 66

type LayerMessage struct {
	// MESSAGE_TYPE 1 byte
	PublicKey string // 64 bytes
	Layer     uint8
}

func deserializeLayerPayload(
	payload []byte,
) (LayerMessage, error) {
	if len(payload) != LAYER_MESSAGE_LENGTH {
		return LayerMessage{}, fmt.Errorf("invalid payload length")
	}
	return LayerMessage{
		PublicKey: string(payload[1:65]),
		Layer:     payload[65],
	}, nil
}

func (s *StatsManager) checkLayerAchievements(msg LayerMessage) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	stats, err := s.MainDB.GetStatisticsMap(
		ctx,
		msg.PublicKey,
	)
	if err != nil {
		slog.Error("get stats", "err", err)
		return
	}
	layersAchievements, ok :=
		stats["achievements"].(map[string]any)["layers"].([]any)
	if !ok {
		slog.Error("no achievements for layers",
			"player", msg.PublicKey)
		return
	}
	layerCat := s.AchievementConfig.Categories[CATEGORY_LAYERS]
	for _, thresholdAchievement := range layerCat.Thresholds {
		if msg.Layer+1 != uint8(thresholdAchievement.ID) {
			// Not the right layer
			continue
		}
		// check if player has already earned this achievement
		if Contains(layersAchievements, thresholdAchievement.Key) {
			continue
		}
		// player just earned this achievement
		slog.Info("unlocked layer achievement",
			"player", msg.PublicKey,
			"layer", msg.Layer,
		)
		err = s.MainDB.AddAchievement(
			ctx,
			msg.PublicKey,
			"layers",
			thresholdAchievement.Key,
			thresholdAchievement.Reward,
		)
		if err != nil {
			slog.Error("add layer achievement",
				"err", err)
		}
		notification := achievement.BuildNotificationMessage(
			msg.PublicKey,
			CATEGORY_LAYERS,
			THRESHOLDS,
			uint8(thresholdAchievement.ID),
		)
		s.PublishNotification(notification)
	}
}

func (s *StatsManager) HandleLayerMessage(
	payload []byte,
) error {
	msg, err := deserializeLayerPayload(payload)
	if err != nil {
		return err
	}
	go s.checkLayerAchievements(msg)
	return nil
}
