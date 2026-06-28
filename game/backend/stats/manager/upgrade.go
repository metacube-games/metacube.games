package manager

import (
	"backend/stats/achievement"
	"context"
	"fmt"
	"log/slog"
	"time"
)

const UPGRADE_MESSAGE_LENGTH = 67

type UpgradeMessage struct {
	// MESSAGE_TYPE 1 byte
	PublicKey string // 64 bytes
	SkillID   uint8
	Level     uint8
}

func deserializeUpgradePayload(
	payload []byte,
) (UpgradeMessage, error) {
	if len(payload) != UPGRADE_MESSAGE_LENGTH {
		return UpgradeMessage{}, fmt.Errorf("invalid payload length")
	}
	return UpgradeMessage{
		PublicKey: string(payload[1:65]),
		SkillID:   payload[65],
		Level:     payload[66],
	}, nil
}

func (s *StatsManager) checkUpgradeAchievements(msg UpgradeMessage) {
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
	achievements := stats["achievements"].(map[string]any)
	upgradesAchievements, ok := achievements["upgrades"].([]any)
	if !ok {
		slog.Error("no achievements for upgrades",
			"player", msg.PublicKey)
		return
	}
	// ---
	// NOTE: no type achievements for upgrades for the moment
	// ---
	upgradeCat := s.AchievementConfig.Categories[CATEGORY_UPGRADES]
	for _, thresholdAchievement := range upgradeCat.Thresholds {
		if msg.Level < uint8(thresholdAchievement.Threshold) {
			// Not the right level of upgrade
			continue
		}
		// check if player has already earned this achievement
		if Contains(upgradesAchievements, thresholdAchievement.Key) {
			continue
		}
		// player just earned this achievement
		slog.Info("earned upgrade achievement",
			"player", msg.PublicKey,
			"key", thresholdAchievement.Key,
		)
		err = s.MainDB.AddAchievement(
			ctx,
			msg.PublicKey,
			"upgrades",
			thresholdAchievement.Key,
			thresholdAchievement.Reward,
		)
		if err != nil {
			slog.Error("add upgrade achievement",
				"err", err)
		}
		notification := achievement.BuildNotificationMessage(
			msg.PublicKey,
			CATEGORY_UPGRADES,
			THRESHOLDS,
			uint8(thresholdAchievement.ID),
		)
		s.PublishNotification(notification)
	}
}

func (s *StatsManager) HandleUpgradeMessage(payload []byte) error {
	msg, err := deserializeUpgradePayload(payload)
	if err != nil {
		return err
	}
	slog.Info("upgraded skill",
		"player", msg.PublicKey,
		"skill", msg.SkillID,
		"level", msg.Level,
	)
	go s.checkUpgradeAchievements(msg)
	return nil
}
