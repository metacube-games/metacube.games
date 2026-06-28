package manager

import (
	"backend/blockchain"
	"backend/databases/data"
	"backend/databases/game"
	"backend/internal/constants"
	"backend/internal/pubsubutil"
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"slices"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

type StatsManager struct {
	GameDB                 *game.GameDB
	MainDB                 *data.MainDB
	AchievementConfig      AchievementConfig
	AchievementsChan       chan []byte
	SUSPENDED_TIME_SECONDS int
	TxChan                 chan blockchain.NFT_tx
}

func Contains(slice []any, item any) bool {
	return slices.Contains(slice, item)
}

const TYPES = 0
const THRESHOLDS = 1

const CATEGORY_CUBES = 0
const CATEGORY_LAYERS = 1
const CATEGORY_UPGRADES = 2
const CATEGORY_ALLY = 3
const CATEGORY_ATTACKS = 4
const CATEGORY_DEATHS = 5
const CATEGORY_STREAKS = 6
const CATEGORY_LINKS = 7
const CATEGORY_SKINS = 8
const CATEGORY_BLOCKS = 9

type AchievementConfig struct {
	Categories   []AchievementCategory `json:"categories"`
	TypesID      int                   `json:"typesID"`
	ThresholdsID int                   `json:"thresholdsID"`
}

type AchievementCategory struct {
	Name       string        `json:"name"`
	ID         int           `json:"id"`
	Types      []Achievement `json:"types"`
	Thresholds []Achievement `json:"thresholds"`
}

type Achievement struct {
	Key       string `json:"key"`
	ID        int    `json:"id"`
	Reward    int    `json:"reward"`
	Type      int    `json:"type,omitempty"`
	Threshold int    `json:"threshold,omitempty"`
}

func (s *StatsManager) ListenForEvents() {
	go pubsubutil.Subscribe(
		s.GameDB.Client, "stats-manager",
		func(msg *redis.Message) {
			payload := []byte(msg.Payload)
			switch payload[0] {
			case constants.DBManagerVoxelDestroyedType:
				go func() {
					ctx, cancel := context.WithTimeout(
						context.Background(), 5*time.Second)
					defer cancel()
					err := s.HandleVoxelDestroyedMessage(payload)
					if err != nil {
						slog.Error("handle voxel destroyed",
							"err", err)
					}
					err = s.GameDB.DecrNbVoxelsAlive(ctx)
					if err != nil {
						slog.Error("decr voxels alive",
							"err", err)
					}
					nb, err := s.GameDB.IncrNbVoxelsDead(ctx)
					if err != nil {
						slog.Error("incr voxels dead",
							"err", err)
					}
					switch nb {
					case constants.Layer5NbVoxels:
						s.advanceLayer(ctx, payload, 4, 5)
					case constants.Layer4NbVoxels:
						s.advanceLayer(ctx, payload, 3, 4)
					case constants.Layer3NbVoxels:
						s.advanceLayer(ctx, payload, 2, 3)
					case constants.Layer2NbVoxels:
						s.advanceLayer(ctx, payload, 1, 2)
					case constants.Layer1NbVoxels:
						s.advanceLayer(ctx, payload, 0, 1)
					case constants.Layer0NbVoxels:
						s.advanceLayer(ctx, payload, 10, 0)
					}
				}()
			case constants.DBManagerAttackType:
				go func() {
					err := s.HandleAttackMessage(payload)
					if err != nil {
						slog.Error("handle attack",
							"err", err)
					}
				}()
			default:
				slog.Error("unknown message type",
					"type", payload[0])
			}
		},
		constants.RedisChannelDBManager,
	)

	for payload := range s.AchievementsChan {
		switch payload[0] {
		case constants.DBManagerUpgradeType:
			go func() {
				err := s.HandleUpgradeMessage(payload)
				if err != nil {
					slog.Error("handle upgrade", "err", err)
				}
			}()
		case constants.DBManagerStreakType:
			go func() {
				err := s.HandleStreakMessage(payload)
				if err != nil {
					slog.Error("handle streak", "err", err)
				}
			}()
		case constants.DBManagerSkinType:
			go func() {
				err := s.HandleSkinMessage(payload)
				if err != nil {
					slog.Error("handle skin", "err", err)
				}
			}()
		case constants.DBManagerLinkType:
			go func() {
				err := s.HandleLinkMessage(payload)
				if err != nil {
					slog.Error("handle link", "err", err)
				}
			}()
		case constants.DBManagerLayerType:
			go func() {
				err := s.HandleLayerMessage(payload)
				if err != nil {
					slog.Error("handle layer", "err", err)
				}
			}()
		case constants.DBManagerAllyType:
			go func() {
				err := s.HandleAllyMessage(payload)
				if err != nil {
					slog.Error("handle ally", "err", err)
				}
			}()
		default:
			slog.Error("unknown message type",
				"type", payload[0])
		}
	}
}

func (s *StatsManager) advanceLayer(
	ctx context.Context,
	payload []byte,
	newLayer, lastPlayerLayer int,
) {
	shouldPublish, err := s.GameDB.UpdateLayerInfo(ctx, newLayer)
	if err != nil {
		slog.Error("update layer info", "err", err)
		return
	}
	if !shouldPublish {
		return
	}
	s.GameDB.PublishNewLayer(ctx, newLayer)
	publicKey, err := s.GetPublicKeyFromPayload(payload)
	if err != nil {
		slog.Error("get public key", "err", err)
		return
	}
	s.GameDB.SaveLayerLastPlayer(ctx, lastPlayerLayer, publicKey)
}

func (s *StatsManager) PublishNotification(message string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	s.GameDB.Client.Publish(
		ctx,
		constants.RedisChannelAchievementNotification,
		message,
	)
}

func InitAndStartStatsManager(
	envFile map[string]string,
	txChan chan blockchain.NFT_tx,
	achievementsChan chan []byte,
) {
	g, err := game.NewGameDB(envFile)
	if err != nil {
		slog.Error("stats manager: game db init failed", "err", err)
		os.Exit(1)
	}

	m, err := data.NewMainDB(envFile)
	if err != nil {
		slog.Error("stats manager: main db init failed", "err", err)
		os.Exit(1)
	}

	SUSPENDED_TIME_SECONDS, _ := strconv.Atoi(
		envFile["STATS_MANAGER_SUSPENDED_TIME_SECONDS"],
	)

	fileContent, err := os.ReadFile(
		envFile["STATS_MANAGER_ACHIEVEMENTS_FILE_PATH"],
	)
	if err != nil {
		slog.Error("read achievements file",
			"path", envFile["STATS_MANAGER_ACHIEVEMENTS_FILE_PATH"],
			"err", err,
		)
		os.Exit(1)
	}
	var achievementConfig AchievementConfig
	if err := json.Unmarshal(fileContent, &achievementConfig); err != nil {
		slog.Error("parse achievements file", "err", err)
		os.Exit(1)
	}

	statsManager := StatsManager{
		GameDB:                 g,
		MainDB:                 m,
		AchievementConfig:      achievementConfig,
		AchievementsChan:       achievementsChan,
		SUSPENDED_TIME_SECONDS: SUSPENDED_TIME_SECONDS,
		TxChan:                 txChan,
	}

	go statsManager.ListenForEvents()
}
