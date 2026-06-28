package manager

import (
	"backend/blockchain"
	"backend/stats/achievement"
	"context"
	"encoding/binary"
	"fmt"
	"log/slog"
	"time"
)

const VOXEL_DESTROYED_MESSAGE_LENGTH = 73

type VoxelDestroyedMessage struct {
	// MESSAGE_TYPE 1 byte
	PublicKey  string // 64 bytes
	CoinsToAdd uint32
	NewHP      uint8
	NFT_ID     uint16
	Type       uint8
}

func deserializeVoxelDestroyedPayload(
	payload []byte,
) (VoxelDestroyedMessage, error) {
	if len(payload) != VOXEL_DESTROYED_MESSAGE_LENGTH {
		return VoxelDestroyedMessage{}, fmt.Errorf("invalid payload length")
	}
	return VoxelDestroyedMessage{
		PublicKey:  string(payload[1:65]),
		CoinsToAdd: binary.LittleEndian.Uint32(payload[65:69]),
		NewHP:      payload[69],
		NFT_ID:     binary.LittleEndian.Uint16(payload[70:72]),
		Type:       payload[72],
	}, nil
}

func (s *StatsManager) checkVoxelAchievements(msg VoxelDestroyedMessage) {
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
	cubes, ok := stats["cubes"].(float64)
	if !ok {
		slog.Error("no statistics for cubes",
			"player", msg.PublicKey)
		return
	}
	cubesAchievements, ok :=
		stats["achievements"].(map[string]any)["cubes"].([]any)
	if !ok {
		slog.Error("no achievements for cubes",
			"player", msg.PublicKey)
		return
	}
	achievedAll := true
	cubeTypes := s.AchievementConfig.Categories[CATEGORY_CUBES].Types
	for _, typeAchievement := range cubeTypes {
		// check if player has already earned this achievement
		if Contains(cubesAchievements, typeAchievement.Key) {
			continue
		}
		if msg.Type != uint8(typeAchievement.Type) {
			achievedAll = false
			// Not the right type of voxel
			continue
		}
		// player just earned this achievement
		slog.Info("earned cubes type achievement",
			"player", msg.PublicKey,
			"key", typeAchievement.Key,
		)
		err = s.MainDB.AddAchievement(
			ctx,
			msg.PublicKey,
			"cubes",
			typeAchievement.Key,
			typeAchievement.Reward,
		)
		if err != nil {
			slog.Error("add cubes achievement",
				"err", err)
		}
		notification := achievement.BuildNotificationMessage(
			msg.PublicKey,
			CATEGORY_CUBES,
			TYPES,
			uint8(typeAchievement.ID),
		)
		s.PublishNotification(notification)
	}

	if achievedAll {
		achieved, err := s.MainDB.HasBlockAchievement(
			ctx,
			msg.PublicKey,
		)
		if err != nil {
			slog.Error("has block achievement",
				"err", err)
			return
		}
		if !achieved {
			slog.Info("earned block achievement",
				"player", msg.PublicKey)
			blockCat := s.AchievementConfig.Categories[CATEGORY_BLOCKS]
			err = s.MainDB.AddAchievement(
				ctx,
				msg.PublicKey,
				"blocks",
				blockCat.Thresholds[0].Key,
				blockCat.Thresholds[0].Reward,
			)
			if err != nil {
				slog.Error("add block achievement",
					"err", err)
				return
			}
			notification := achievement.BuildNotificationMessage(
				msg.PublicKey,
				CATEGORY_BLOCKS,
				THRESHOLDS,
				uint8(blockCat.Thresholds[0].ID),
			)
			time.Sleep(2 * time.Second)
			s.PublishNotification(notification)
		}
	}

	cubeCat := s.AchievementConfig.Categories[CATEGORY_CUBES]
	for _, thresholdAchievement := range cubeCat.Thresholds {
		if cubes < float64(thresholdAchievement.Threshold) {
			// Player has not reached this threshold yet
			break
		}
		// check if player has already earned this achievement
		if Contains(cubesAchievements, thresholdAchievement.Key) {
			continue
		}
		// player has reached this threshold and has not earned this
		// achievement yet
		slog.Info("earned cubes threshold achievement",
			"player", msg.PublicKey,
			"key", thresholdAchievement.Key,
		)
		err = s.MainDB.AddAchievement(
			ctx,
			msg.PublicKey,
			"cubes",
			thresholdAchievement.Key,
			thresholdAchievement.Reward,
		)
		if err != nil {
			slog.Error("add cubes threshold",
				"err", err)
			return
		}
		notification := achievement.BuildNotificationMessage(
			msg.PublicKey,
			CATEGORY_CUBES,
			THRESHOLDS,
			uint8(thresholdAchievement.ID),
		)
		s.PublishNotification(notification)
	}

	// Check referral status
	if cubes >= 1000 {
		referrer, succeeded, err := s.MainDB.IsReferred(
			ctx,
			msg.PublicKey,
		)
		if err != nil {
			slog.Error("is referred", "err", err)
			return
		}
		if referrer != "" && !succeeded {
			flipped, err := s.MainDB.SetReferralSucceeded(
				ctx,
				msg.PublicKey,
			)
			if err != nil {
				slog.Error("set referral succeeded",
					"err", err)
				return
			}
			if !flipped {
				return
			}
			slog.Info("referral succeeded",
				"referrer", referrer,
				"player", msg.PublicKey,
			)
			if err := s.MainDB.AddCoins(
				ctx, referrer, 10000,
			); err != nil {
				slog.Error("add coins referrer", "err", err)
			}
			if err := s.MainDB.AddCoins(
				ctx, msg.PublicKey, 10000,
			); err != nil {
				slog.Error("add coins player", "err", err)
			}
		}
	}
}

func (s *StatsManager) HandleVoxelDestroyedMessage(payload []byte) error {
	msg, err := deserializeVoxelDestroyedPayload(payload)
	if err != nil {
		return err
	}
	displayId := -1
	if msg.NFT_ID > 0 {
		displayId = int(msg.NFT_ID - 1)
	}
	slog.Info("voxel destroyed",
		"player", msg.PublicKey,
		"type", msg.Type,
		"coinsAdded", msg.CoinsToAdd,
		"nft", displayId,
		"hp", msg.NewHP,
	)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rewardAddress, err := s.MainDB.GetRewardAddress(
		ctx,
		msg.PublicKey,
	)
	if err != nil {
		return err
	}
	if msg.NFT_ID != 0 && rewardAddress != "" {
		s.TxChan <- blockchain.NFT_tx{
			To:      rewardAddress,
			TokenID: uint64(msg.NFT_ID - 1),
		}
	}
	err = s.MainDB.UpdateDatabaseVoxelDestroyed(
		ctx,
		msg.PublicKey,
		msg.CoinsToAdd,
		msg.NewHP,
		msg.NFT_ID,
		rewardAddress != "",
	)
	if err != nil {
		return err
	}
	go s.checkVoxelAchievements(msg)
	return err
}

func (s *StatsManager) GetPublicKeyFromPayload(
	payload []byte,
) (string, error) {
	if len(payload) != VOXEL_DESTROYED_MESSAGE_LENGTH {
		return "", fmt.Errorf("invalid payload length")
	}
	return string(payload[1:65]), nil
}
