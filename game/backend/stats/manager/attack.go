package manager

import (
	"backend/stats/achievement"
	"context"
	"encoding/binary"
	"fmt"
	"log/slog"
	"time"
)

const ATTACK_MESSAGE_LENGTH = 71

type AttackMessage struct {
	// MESSAGE_TYPE 1 byte
	PublicKey     string // 64 bytes
	CoinsToRemove uint32
	NewHP         uint8
	AttackType    uint8
}

func deserializeAttackPayload(payload []byte) (AttackMessage, error) {
	if len(payload) != ATTACK_MESSAGE_LENGTH {
		return AttackMessage{}, fmt.Errorf("invalid payload length")
	}
	return AttackMessage{
		PublicKey:     string(payload[1:65]),
		CoinsToRemove: binary.LittleEndian.Uint32(payload[65:69]),
		NewHP:         payload[69],
		AttackType:    payload[70],
	}, nil
}

func (s *StatsManager) checkAttackAchievements(msg AttackMessage) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	stats, err := s.MainDB.GetStatisticsMap(ctx, msg.PublicKey)
	if err != nil {
		slog.Error("get stats", "err", err)
		return
	}
	achievements := stats["achievements"].(map[string]any)
	attacksAchievements, ok := achievements["attacks"].([]any)
	if !ok {
		slog.Error("no achievements for attacks",
			"player", msg.PublicKey)
		return
	}
	attackTypes := s.AchievementConfig.Categories[CATEGORY_ATTACKS].Types
	for _, typeAchievement := range attackTypes {
		if msg.AttackType != uint8(typeAchievement.Type) {
			// Not the right type of attack
			continue
		}
		// check if player has already earned this achievement
		if Contains(attacksAchievements, typeAchievement.Key) {
			continue
		}
		// player just earned this achievement
		slog.Info("earned attack achievement",
			"player", msg.PublicKey,
			"key", typeAchievement.Key,
		)
		err = s.MainDB.AddAchievement(
			ctx,
			msg.PublicKey,
			"attacks",
			typeAchievement.Key,
			typeAchievement.Reward,
		)
		if err != nil {
			slog.Error("add attack achievement",
				"err", err)
		}
		notification := achievement.BuildNotificationMessage(
			msg.PublicKey,
			CATEGORY_ATTACKS,
			TYPES,
			uint8(typeAchievement.ID),
		)
		if msg.NewHP == 0 {
			time.Sleep(2 * time.Second)
		}
		s.PublishNotification(notification)
	}
	// ---
	// NOTE: no threshold achievements for attacks for the moment
	// ---
	if msg.NewHP != 0 {
		return
	}
	deaths, ok := stats["deaths"].(float64)
	if !ok {
		slog.Error("no statistics for deaths",
			"player", msg.PublicKey)
		return
	}
	deathsAchievements, ok :=
		stats["achievements"].(map[string]any)["deaths"].([]any)
	if !ok {
		slog.Error("no achievements for deaths",
			"player", msg.PublicKey)
		return
	}
	deathTypes := s.AchievementConfig.Categories[CATEGORY_DEATHS].Types
	for _, typeAchievement := range deathTypes {
		if msg.AttackType != uint8(typeAchievement.Type) {
			// Not the right type of attack
			continue
		}
		// check if player has already earned this achievement
		if Contains(deathsAchievements, typeAchievement.Key) {
			continue
		}
		// player just earned this achievement
		slog.Info("earned death by attack achievement",
			"player", msg.PublicKey,
			"key", typeAchievement.Key,
		)
		err = s.MainDB.AddAchievement(
			ctx,
			msg.PublicKey,
			"deaths",
			typeAchievement.Key,
			typeAchievement.Reward,
		)
		if err != nil {
			slog.Error("add death achievement",
				"err", err)
		}
		notification := achievement.BuildNotificationMessage(
			msg.PublicKey,
			CATEGORY_DEATHS,
			TYPES,
			uint8(typeAchievement.ID),
		)
		time.Sleep(2 * time.Second)
		s.PublishNotification(notification)
	}
	deathCat := s.AchievementConfig.Categories[CATEGORY_DEATHS]
	for _, thresholdAchievement := range deathCat.Thresholds {
		if deaths < float64(thresholdAchievement.Threshold) {
			// Player has not reached this threshold yet
			return
		}
		// check if player has already earned this achievement
		if Contains(deathsAchievements, thresholdAchievement.Key) {
			continue
		}
		// player has reached this threshold and has not earned this achievement
		// yet
		slog.Info("earned deaths threshold achievement",
			"player", msg.PublicKey,
			"key", thresholdAchievement.Key,
		)
		err = s.MainDB.AddAchievement(
			ctx,
			msg.PublicKey,
			"deaths",
			thresholdAchievement.Key,
			thresholdAchievement.Reward,
		)
		if err != nil {
			slog.Error("add deaths achievement",
				"err", err)
			return
		}
		notification := achievement.BuildNotificationMessage(
			msg.PublicKey,
			CATEGORY_DEATHS,
			THRESHOLDS,
			uint8(thresholdAchievement.ID),
		)
		time.Sleep(2 * time.Second)
		s.PublishNotification(notification)
	}
}

func (s *StatsManager) HandleAttackMessage(payload []byte) error {
	msg, err := deserializeAttackPayload(payload)
	if err != nil {
		return err
	}
	// all fall attacks are the same type
	if msg.AttackType == 1 || msg.AttackType == 2 {
		msg.AttackType = 0
	}
	slog.Info("player attacked",
		"player", msg.PublicKey,
		"type", msg.AttackType,
		"coinsRemoved", msg.CoinsToRemove,
		"hp", msg.NewHP,
	)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var suspendedUntil int64 = 0
	if msg.NewHP == 0 {
		suspendedUntil = time.Now().Unix() + int64(s.SUSPENDED_TIME_SECONDS)
	}
	err = s.MainDB.UpdateDatabaseAttack(
		ctx,
		msg.PublicKey,
		msg.CoinsToRemove,
		int(msg.NewHP),
		suspendedUntil,
	)
	if err != nil {
		return err
	}
	s.checkAttackAchievements(msg)
	return err
}
