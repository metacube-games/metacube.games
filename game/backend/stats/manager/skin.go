package manager

import (
	"backend/stats/achievement"
	"context"
	"fmt"
	"log/slog"
	"time"
)

const SKINS_MESSAGE_LENGTH = 65

type SkinMessage struct {
	// MESSAGE_TYPE 1 byte
	PublicKey string // 64 bytes
}

func deserializeSkinPayload(
	payload []byte,
) (SkinMessage, error) {
	if len(payload) != SKINS_MESSAGE_LENGTH {
		return SkinMessage{}, fmt.Errorf("invalid payload length")
	}
	return SkinMessage{
		PublicKey: string(payload[1:65]),
	}, nil
}

func (s *StatsManager) checkSkinAchievements(msg SkinMessage) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// player just earned this achievement
	slog.Info("unlocked skin achievement",
		"player", msg.PublicKey)
	err := s.MainDB.AddAchievement(
		ctx,
		msg.PublicKey,
		"skins",
		s.AchievementConfig.Categories[CATEGORY_SKINS].Thresholds[0].Key,
		s.AchievementConfig.Categories[CATEGORY_SKINS].Thresholds[0].Reward,
	)
	if err != nil {
		slog.Error("add skin achievement", "err", err)
	}
	notification := achievement.BuildNotificationMessage(
		msg.PublicKey,
		CATEGORY_SKINS,
		THRESHOLDS,
		uint8(s.AchievementConfig.Categories[CATEGORY_SKINS].Thresholds[0].ID),
	)
	s.PublishNotification(notification)
}

func (s *StatsManager) HandleSkinMessage(payload []byte) error {
	msg, err := deserializeSkinPayload(payload)
	if err != nil {
		return err
	}
	go s.checkSkinAchievements(msg)
	return nil
}
