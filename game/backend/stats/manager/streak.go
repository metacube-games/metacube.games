package manager

import (
	"backend/stats/achievement"
	"context"
	"fmt"
	"log/slog"
	"time"
)

const STREAK_MESSAGE_LENGTH = 65

type StreakMessage struct {
	// MESSAGE_TYPE 1 byte
	PublicKey string // 64 bytes
}

func deserializeStreakPayload(
	payload []byte,
) (StreakMessage, error) {
	if len(payload) != STREAK_MESSAGE_LENGTH {
		return StreakMessage{}, fmt.Errorf("invalid payload length")
	}
	return StreakMessage{
		PublicKey: string(payload[1:65]),
	}, nil
}

func (s *StatsManager) checkStreakAchievements(msg StreakMessage) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// player just earned this achievement
	slog.Info("unlocked streak achievement",
		"player", msg.PublicKey)
	err := s.MainDB.AddAchievement(
		ctx,
		msg.PublicKey,
		"streaks",
		s.AchievementConfig.Categories[CATEGORY_STREAKS].Thresholds[0].Key,
		s.AchievementConfig.Categories[CATEGORY_STREAKS].Thresholds[0].Reward,
	)
	if err != nil {
		slog.Error("add streak achievement", "err", err)
	}
	streakCat := s.AchievementConfig.Categories[CATEGORY_STREAKS]
	notification := achievement.BuildNotificationMessage(
		msg.PublicKey,
		CATEGORY_STREAKS,
		THRESHOLDS,
		uint8(streakCat.Thresholds[0].ID),
	)
	time.Sleep(2 * time.Second)
	s.PublishNotification(notification)
}

func (s *StatsManager) HandleStreakMessage(payload []byte) error {
	msg, err := deserializeStreakPayload(payload)
	if err != nil {
		return err
	}
	go s.checkStreakAchievements(msg)
	return nil
}
