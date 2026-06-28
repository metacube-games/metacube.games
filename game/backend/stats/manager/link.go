package manager

import (
	"backend/stats/achievement"
	"context"
	"fmt"
	"log/slog"
	"time"
)

const LINK_MESSAGE_LENGTH = 65

type LinkMessage struct {
	// MESSAGE_TYPE 1 byte
	PublicKey string // 64 bytes
}

func deserializeLinkPayload(
	payload []byte,
) (LinkMessage, error) {
	if len(payload) != LINK_MESSAGE_LENGTH {
		return LinkMessage{}, fmt.Errorf("invalid payload length")
	}
	return LinkMessage{
		PublicKey: string(payload[1:65]),
	}, nil
}

func (s *StatsManager) checkLinkAchievements(msg LinkMessage) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// player just earned this achievement
	slog.Info("unlocked link achievement",
		"player", msg.PublicKey)
	err := s.MainDB.AddAchievement(
		ctx,
		msg.PublicKey,
		"links",
		s.AchievementConfig.Categories[CATEGORY_LINKS].Thresholds[0].Key,
		s.AchievementConfig.Categories[CATEGORY_LINKS].Thresholds[0].Reward,
	)
	if err != nil {
		slog.Error("add link achievement", "err", err)
	}
	notification := achievement.BuildNotificationMessage(
		msg.PublicKey,
		CATEGORY_LINKS,
		THRESHOLDS,
		uint8(s.AchievementConfig.Categories[CATEGORY_LINKS].Thresholds[0].ID),
	)
	s.PublishNotification(notification)
}

func (s *StatsManager) HandleLinkMessage(payload []byte) error {
	msg, err := deserializeLinkPayload(payload)
	if err != nil {
		return err
	}
	go s.checkLinkAchievements(msg)
	return nil
}
