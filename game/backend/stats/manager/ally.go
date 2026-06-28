package manager

import (
	"backend/stats/achievement"
	"context"
	"fmt"
	"log/slog"
	"time"
)

const ALLY_MESSAGE_LENGTH = 65

type AllyMessage struct {
	// MESSAGE_TYPE 1 byte
	PublicKey string // 64 bytes
}

func deserializeAllyPayload(
	payload []byte,
) (AllyMessage, error) {
	if len(payload) != ALLY_MESSAGE_LENGTH {
		return AllyMessage{}, fmt.Errorf("invalid payload length")
	}
	return AllyMessage{
		PublicKey: string(payload[1:65]),
	}, nil
}

func (s *StatsManager) checkAllyAchievements(msg AllyMessage) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// player just earned this achievement
	slog.Info("unlocked ally achievement",
		"player", msg.PublicKey)
	err := s.MainDB.AddAchievement(
		ctx,
		msg.PublicKey,
		"ally",
		s.AchievementConfig.Categories[CATEGORY_ALLY].Thresholds[0].Key,
		s.AchievementConfig.Categories[CATEGORY_ALLY].Thresholds[0].Reward,
	)
	if err != nil {
		slog.Error("add ally achievement", "err", err)
	}
	notification := achievement.BuildNotificationMessage(
		msg.PublicKey,
		CATEGORY_ALLY,
		THRESHOLDS,
		uint8(s.AchievementConfig.Categories[CATEGORY_ALLY].Thresholds[0].ID),
	)
	s.PublishNotification(notification)
}

func (s *StatsManager) HandleAllyMessage(payload []byte) error {
	msg, err := deserializeAllyPayload(payload)
	if err != nil {
		return err
	}
	go s.checkAllyAchievements(msg)
	return nil
}
