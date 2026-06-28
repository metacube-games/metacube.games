package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

type PlayerData struct {
	PublicKey        string `json:"publicKey"`
	Username         string `json:"username"`
	SuspendedUntil   int64  `json:"suspendedUntil"`
	Coins            int    `json:"coins"`
	HP               int    `json:"hp"`
	DamageLevel      int    `json:"damageLevel"`
	MultiplierLevel  int    `json:"multiplierLevel"`
	HealthLevel      int    `json:"healthLevel"`
	AttackRangeLevel int    `json:"attackRangeLevel"`
	FlyLevel         int    `json:"flyLevel"`
	CriticalHitLevel int    `json:"criticalHitLevel"`
	Banned           bool   `json:"banned"`
	SkinId           int    `json:"skinId"`
	RewardAddress    string `json:"rewardAddress"`
	Email            string `json:"email"`
	Name             string `json:"name"`
}

type PlayerStatistics struct {
	Joined       int64          `json:"joined"`
	Cubes        int            `json:"cubes"`
	Deaths       int            `json:"deaths"`
	TotalCoins   int            `json:"totalCoins"`
	Achievements map[string]any `json:"achievements"`
}

// GetSkill returns the skill from the skill name
func (skills Skills) GetSkill(skill string) *Skill {
	switch skill {
	case "damage":
		return &skills.Damage
	case "multiplier":
		return &skills.Multiplier
	case "health":
		return &skills.Health
	case "attackRange":
		return &skills.AttackRange
	case "fly":
		return &skills.Fly
	case "criticalHit":
		return &skills.CriticalHit
	default:
		return nil
	}
}

// GetSkillValue returns the value of a skill at a certain level
func (skill *Skill) GetSkillValue(level int) int {
	return skill.Levels[level-1].Value
}

// GetSkillLevel returns the player level of a skill
func (PlayerData *PlayerData) GetSkillLevel(skill string) int {
	switch skill {
	case "damage":
		return PlayerData.DamageLevel
	case "multiplier":
		return PlayerData.MultiplierLevel
	case "health":
		return PlayerData.HealthLevel
	case "attackRange":
		return PlayerData.AttackRangeLevel
	case "fly":
		return PlayerData.FlyLevel
	case "criticalHit":
		return PlayerData.CriticalHitLevel
	default:
		return 0
	}
}

// SetSkillLevel sets the player level of a skill
func (PlayerData *PlayerData) SetSkillLevel(
	skill string,
	level int,
	value int,
) {
	switch skill {
	case "damage":
		PlayerData.DamageLevel = level
	case "multiplier":
		PlayerData.MultiplierLevel = level
	case "health":
		PlayerData.HealthLevel = level
		PlayerData.HP = value
	case "attackRange":
		PlayerData.AttackRangeLevel = level
	case "fly":
		PlayerData.FlyLevel = level
	case "criticalHit":
		PlayerData.CriticalHitLevel = level
	}
}

// GetPlayerInfo returns player data from the database
func (mainDB *MainDB) GetPlayerData(
	ctx context.Context,
	publicKey string,
) (*PlayerData, error) {
	playerInfo := &PlayerData{}
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT publicKey, username, suspendedUntil, coins, hp, damageLevel, "+
			"multiplierLevel, healthLevel, attackRangeLevel, flyLevel, "+
			"criticalHitLevel, banned, skinId, rewardAddress, email, name "+
			"FROM Players WHERE publicKey = ?",
		publicKey,
	).Scan(
		&playerInfo.PublicKey,
		&playerInfo.Username,
		&playerInfo.SuspendedUntil,
		&playerInfo.Coins,
		&playerInfo.HP,
		&playerInfo.DamageLevel,
		&playerInfo.MultiplierLevel,
		&playerInfo.HealthLevel,
		&playerInfo.AttackRangeLevel,
		&playerInfo.FlyLevel,
		&playerInfo.CriticalHitLevel,
		&playerInfo.Banned,
		&playerInfo.SkinId,
		&playerInfo.RewardAddress,
		&playerInfo.Email,
		&playerInfo.Name,
	)
	if err != nil {
		return nil, err
	}
	return playerInfo, nil
}

const defaultUsername = ""
const defaultSuspendedUntil = 0
const defaultCoins = 0
const defaultBanned = false
const defaultSkinID = 0

const defaultHP = 5
const defaultLevel = 1

// AddNewPlayer adds a new player to the database
func (mainDB *MainDB) AddNewPlayer(
	ctx context.Context,
	publicKey string,
	name string,
	email string,
	rewardAddress string,
) (*PlayerData, error) {
	newPlayerData := &PlayerData{
		PublicKey:        publicKey,
		Username:         defaultUsername,
		SuspendedUntil:   defaultSuspendedUntil,
		Coins:            defaultCoins,
		HP:               defaultHP,
		DamageLevel:      defaultLevel,
		MultiplierLevel:  defaultLevel,
		HealthLevel:      defaultLevel,
		AttackRangeLevel: defaultLevel,
		FlyLevel:         defaultLevel,
		CriticalHitLevel: defaultLevel,
		Banned:           defaultBanned,
		SkinId:           defaultSkinID,
		RewardAddress:    rewardAddress,
		Email:            email,
		Name:             name,
	}
	statistics := PlayerStatistics{
		Joined: time.Now().Unix(),
		Cubes:  0,
		Deaths: 0,
		Achievements: map[string]any{
			"cubes":    []string{},
			"layers":   []string{},
			"upgrades": []string{},
			"ally":     []string{},
			"attacks":  []string{},
			"deaths":   []string{},
			"streaks":  []string{},
			"links":    []string{},
			"skins":    []string{},
			"blocks":   []string{},
		},
	}
	marshalledStatistics, _ := json.Marshal(statistics)
	_, err := mainDB.Client.ExecContext(
		ctx,
		"INSERT INTO Players (publicKey, username, suspendedUntil, coins, hp, "+
			"damageLevel, multiplierLevel, healthLevel, attackRangeLevel, "+
			"flyLevel, criticalHitLevel, banned, skinId, statistics, name, "+
			"email, rewardAddress) "+
			"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		publicKey,
		newPlayerData.Username,
		newPlayerData.SuspendedUntil,
		newPlayerData.Coins,
		newPlayerData.HP,
		newPlayerData.DamageLevel,
		newPlayerData.MultiplierLevel,
		newPlayerData.HealthLevel,
		newPlayerData.AttackRangeLevel,
		newPlayerData.FlyLevel,
		newPlayerData.CriticalHitLevel,
		newPlayerData.Banned,
		newPlayerData.SkinId,
		marshalledStatistics,
		name,
		email,
		rewardAddress,
	)
	return newPlayerData, err
}

// AtomicUpgrade debits cost and bumps the level in a single UPDATE.
// Returns false if the player can no longer afford it or the level
// moved underneath us.
func (mainDB *MainDB) AtomicUpgrade(
	ctx context.Context,
	publicKey string,
	levelColumn string,
	currentLevel int,
	cost int,
	healthValue int,
) (bool, error) {
	switch levelColumn {
	case "damageLevel", "multiplierLevel", "healthLevel",
		"attackRangeLevel", "flyLevel", "criticalHitLevel":
	default:
		return false, fmt.Errorf("invalid level column: %q", levelColumn)
	}
	var query string
	var args []any
	if healthValue > 0 {
		query = fmt.Sprintf(
			"UPDATE Players SET coins = coins - ?, %s = %s + 1, hp = ? "+
				"WHERE publicKey = ? AND coins >= ? AND %s = ?",
			levelColumn, levelColumn, levelColumn,
		)
		args = []any{
			cost, healthValue, publicKey, cost, currentLevel,
		}
	} else {
		query = fmt.Sprintf(
			"UPDATE Players SET coins = coins - ?, %s = %s + 1 "+
				"WHERE publicKey = ? AND coins >= ? AND %s = ?",
			levelColumn, levelColumn, levelColumn,
		)
		args = []any{cost, publicKey, cost, currentLevel}
	}
	res, err := mainDB.Client.ExecContext(ctx, query, args...)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return n == 1, nil
}

// UpdatePlayerData updates the player data in the database
func (mainDB *MainDB) UpdatePlayerData(
	ctx context.Context,
	playerData *PlayerData,
) error {
	_, err := mainDB.Client.ExecContext(
		ctx,
		"UPDATE Players SET username = ?, suspendedUntil = ?, coins = ?, "+
			"hp = ?, damageLevel = ?, multiplierLevel = ?, healthLevel = ?, "+
			"attackRangeLevel = ?, flyLevel = ?, criticalHitLevel = ?, "+
			"banned = ?, skinId = ? WHERE publicKey = ?",
		playerData.Username,
		playerData.SuspendedUntil,
		playerData.Coins,
		playerData.HP,
		playerData.DamageLevel,
		playerData.MultiplierLevel,
		playerData.HealthLevel,
		playerData.AttackRangeLevel,
		playerData.FlyLevel,
		playerData.CriticalHitLevel,
		playerData.Banned,
		playerData.SkinId,
		playerData.PublicKey,
	)
	return err
}

// UpdateUsername updates the username of a player
func (mainDB *MainDB) UpdateUsername(
	ctx context.Context,
	publicKey string,
	username string,
) error {
	_, err := mainDB.Client.ExecContext(
		ctx,
		"UPDATE Players SET username = ? WHERE publicKey = ?",
		username,
		publicKey,
	)
	return err
}

// UsernameAlreadyExists checks if a username already exists in the database
func (mainDB *MainDB) UsernameAlreadyExists(
	ctx context.Context,
	publicKey string,
	username string,
) (bool, error) {
	var exists bool
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT EXISTS(SELECT 1 FROM Players "+
			"WHERE username = ? AND publicKey != ?)",
		username,
		publicKey,
	).Scan(&exists)
	return exists, err
}

// CheckIfBanned checks if a player is banned
func (mainDB *MainDB) CheckIfBanned(
	ctx context.Context,
	publicKey string,
) (bool, error) {
	playerData, err := mainDB.GetPlayerData(ctx, publicKey)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		} else {
			return false, err
		}
	}
	return playerData.Banned, nil
}

// GetNFTCount returns the number of NFTs discovered so far
func (mainDB *MainDB) GetNFTCount(ctx context.Context) (int, error) {
	var nft int
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT count(*) FROM NFTs",
	).Scan(&nft)
	return nft, err
}

// GetNFTCountForPlayer returns the number of NFTs discovered by a player
func (mainDB *MainDB) GetNFTCountForPlayer(
	ctx context.Context,
	publicKey string,
) (int, error) {
	var nft int
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT count(*) FROM NFTs WHERE ownerPublicKey = ?",
		publicKey,
	).Scan(&nft)
	return nft, err
}

// GetNFTsForPlayer returns the NFTs discovered by a player
func (mainDB *MainDB) GetNFTsForPlayer(
	ctx context.Context,
	publicKey string,
) ([]uint64, error) {
	rows, err := mainDB.Client.QueryContext(
		ctx,
		"SELECT NFT_ID FROM NFTs WHERE ownerPublicKey = ?",
		publicKey,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var nftIDs []uint64
	for rows.Next() {
		var nftID string
		if err := rows.Scan(&nftID); err != nil {
			return nil, err
		}
		v, err := strconv.ParseUint(nftID, 10, 64)
		if err != nil {
			continue
		}
		nftIDs = append(nftIDs, v)
	}
	return nftIDs, rows.Err()
}

// GetNotSentNFTsForPlayer returns the NFTs discovered by a player that were not
// sent yet
func (mainDB *MainDB) GetNotSentNFTsForPlayer(
	ctx context.Context,
	publicKey string,
) ([]uint64, error) {
	rows, err := mainDB.Client.QueryContext(
		ctx,
		"SELECT NFT_ID FROM NFTs WHERE ownerPublicKey = ? AND sent = 0",
		publicKey,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var nftIDs []uint64
	for rows.Next() {
		var nftID string
		if err := rows.Scan(&nftID); err != nil {
			return nil, err
		}
		v, err := strconv.ParseUint(nftID, 10, 64)
		if err != nil {
			continue
		}
		nftIDs = append(nftIDs, v)
	}
	return nftIDs, rows.Err()
}

// MarkNFTsOfPlayerAsSent marks the NFTs of a player as sent
func (mainDB *MainDB) MarkNFTsOfPlayerAsSent(
	ctx context.Context,
	publicKey string,
) error {
	_, err := mainDB.Client.ExecContext(
		ctx,
		"UPDATE NFTs SET sent = 1 WHERE ownerPublicKey = ?",
		publicKey,
	)
	return err
}

// GetStatistics returns the statistics of a player
func (mainDB *MainDB) GetStatistics(
	ctx context.Context,
	publicKey string,
) (string, error) {
	var statistics string
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT statistics FROM Players WHERE publicKey = ?",
		publicKey,
	).Scan(&statistics)
	if err != nil {
		return "", err
	}
	return statistics, nil
}

func (mainDB *MainDB) GetStatisticsMap(
	ctx context.Context,
	publicKey string,
) (map[string]any, error) {
	statistics, err := mainDB.GetStatistics(ctx, publicKey)
	if err != nil {
		return nil, err
	}
	var unmarshalledStatistics map[string]any
	err = json.Unmarshal([]byte(statistics), &unmarshalledStatistics)
	if err != nil {
		return nil, err
	}
	return unmarshalledStatistics, nil
}

type AllStatistics struct {
	Statistics map[string]any `json:"statistics"`
}

// GetAllStatistics returns the statistics of all players
func (mainDB *MainDB) GetAllStatistics(
	ctx context.Context,
) (*AllStatistics, error) {
	rows, err := mainDB.Client.QueryContext(
		ctx,
		"SELECT publicKey, username, statistics FROM Players",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	allStatistics := AllStatistics{
		Statistics: make(map[string]any),
	}
	googleCounter := 0
	guestCounter := 0
	for rows.Next() {
		var publicKey string
		var username string
		var statistics string
		if err := rows.Scan(&publicKey, &username, &statistics); err != nil {
			return nil, err
		}
		var unmarshalledStatistics map[string]any
		json.Unmarshal([]byte(statistics), &unmarshalledStatistics)
		unmarshalledStatistics["username"] = username
		// hide google ids
		if strings.HasPrefix(publicKey, "google") {
			publicKey = "google-" + strconv.Itoa(googleCounter)
			googleCounter++
		}
		// hide guest ids
		if strings.HasPrefix(publicKey, "guest") {
			publicKey = "guest-" + strconv.Itoa(guestCounter)
			guestCounter++
		}
		allStatistics.Statistics[publicKey] = unmarshalledStatistics
	}
	// Adding referral count per player
	referrals, err := mainDB.GetSucceededReferralsCount(ctx)
	if err != nil {
		return nil, err
	}
	for publicKey, stats := range allStatistics.Statistics {
		count := 0
		if val, ok := referrals[publicKey]; ok {
			count = val
		}
		stats.(map[string]any)["referrals"] = count
	}
	return &allStatistics, nil
}

// GetRewardAddress returns the reward address of a player
func (mainDB *MainDB) GetRewardAddress(
	ctx context.Context,
	publicKey string,
) (string, error) {
	var rewardAddress string
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT rewardAddress FROM Players WHERE publicKey = ?",
		publicKey,
	).Scan(&rewardAddress)
	if err != nil {
		return "", err
	}
	return rewardAddress, nil
}

// UpdateRewardAddress updates the reward address of a player
func (mainDB *MainDB) UpdateRewardAddress(
	ctx context.Context,
	publicKey string,
	rewardAddress string,
) error {
	_, err := mainDB.Client.ExecContext(
		ctx,
		"UPDATE Players SET rewardAddress = ? WHERE publicKey = ?",
		rewardAddress,
		publicKey,
	)
	return err
}

// GetNFTIDsPerWalletPlayer returns the NFT IDs of the wallet players
func (mainDB *MainDB) GetNFTIDsPerWalletPlayer(
	ctx context.Context,
) (map[string][]uint64, error) {
	rows, err := mainDB.Client.QueryContext(
		ctx,
		"SELECT ownerPublicKey, NFT_ID FROM NFTs "+
			"WHERE ownerPublicKey NOT LIKE 'google%' "+
			"AND ownerPublicKey NOT LIKE 'guest%'",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	nfts := make(map[string][]uint64)
	for rows.Next() {
		var ownerPublicKey string
		var nftID string
		if err := rows.Scan(&ownerPublicKey, &nftID); err != nil {
			return nil, err
		}
		v, err := strconv.ParseUint(nftID, 10, 64)
		if err != nil {
			continue
		}
		nfts[ownerPublicKey] = append(nfts[ownerPublicKey], v)
	}
	return nfts, rows.Err()
}

// AddAchievement appends an achievement and grants its reward. Idempotent
// via NOT JSON_CONTAINS so concurrent grants don't double-pay.
func (mainDB *MainDB) AddAchievement(
	ctx context.Context,
	publicKey string,
	category string,
	achievement string,
	reward int,
) error {
	_, err := mainDB.Client.ExecContext(
		ctx,
		"UPDATE Players SET statistics = JSON_SET(statistics, "+
			"'$.achievements."+category+"', JSON_ARRAY_APPEND("+
			"JSON_EXTRACT(statistics, '$.achievements."+category+"'), "+
			"'$', ?)), coins = coins + ? "+
			"WHERE publicKey = ? AND NOT JSON_CONTAINS("+
			"JSON_EXTRACT(statistics, '$.achievements."+category+"'), "+
			"JSON_QUOTE(?))",
		achievement,
		reward,
		publicKey,
		achievement,
	)
	return err
}

// GetPlayerCoins returns the coins of a player
func (mainDB *MainDB) GetPlayerCoins(
	ctx context.Context,
	publicKey string,
) (int, error) {
	var coins int
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT coins FROM Players WHERE publicKey = ?",
		publicKey,
	).Scan(&coins)
	return coins, err
}

// UpdateDatabaseVoxelDestroyed updates the database when a voxel is destroyed
func (mainDB *MainDB) UpdateDatabaseVoxelDestroyed(
	ctx context.Context,
	publicKey string,
	coinsToAdd uint32,
	newHP uint8,
	NFT_ID uint16,
	sent bool,
) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := mainDB.Client.ExecContext(
		ctx,
		"UPDATE Players SET coins = coins + ?, hp = ?, "+
			"statistics = JSON_SET(JSON_SET(statistics, '$.totalCoins', "+
			"JSON_EXTRACT(statistics, '$.totalCoins') + ?), '$.cubes', "+
			"JSON_EXTRACT(statistics, '$.cubes') + 1) WHERE publicKey = ?",
		coinsToAdd,
		newHP,
		coinsToAdd,
		publicKey,
	)
	if err != nil {
		return err
	}
	if NFT_ID != 0 {
		_, err = mainDB.Client.ExecContext(
			ctx,
			"INSERT INTO NFTs (NFT_ID, ownerPublicKey, timestamp, sent) "+
				"VALUES (?, ?, ?, ?)",
			NFT_ID,
			publicKey,
			time.Now().Unix(),
			sent,
		)
		return err
	}
	return nil
}

// AddCoins adds coins to a player
func (mainDB *MainDB) AddCoins(
	ctx context.Context,
	publicKey string,
	coinsToAdd uint32,
) error {
	_, err := mainDB.Client.ExecContext(
		ctx,
		"UPDATE Players SET coins = coins + ? WHERE publicKey = ?",
		coinsToAdd,
		publicKey,
	)
	return err
}

// UpdateDatabaseAttack updates the database when an attack is made
func (mainDB *MainDB) UpdateDatabaseAttack(
	ctx context.Context,
	publicKey string,
	coinsToRemove uint32,
	newHP int,
	suspendedUntil int64,
) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var err error
	if newHP == 0 {
		_, err = mainDB.Client.ExecContext(
			ctx,
			"UPDATE Players SET suspendedUntil = ?, "+
				"coins = GREATEST(coins - ?, 0), hp = ?, "+
				"statistics = JSON_SET(statistics, '$.deaths', "+
				"JSON_EXTRACT(statistics, '$.deaths') + 1) "+
				"WHERE publicKey = ?",
			suspendedUntil,
			coinsToRemove,
			newHP,
			publicKey,
		)
	} else {
		_, err = mainDB.Client.ExecContext(
			ctx,
			"UPDATE Players SET suspendedUntil = ?, "+
				"coins = GREATEST(coins - ?, 0), hp = ? "+
				"WHERE publicKey = ?",
			suspendedUntil,
			coinsToRemove,
			newHP,
			publicKey,
		)
	}
	return err
}

// GetUsername returns the username of a player
func (mainDB *MainDB) GetUsername(
	ctx context.Context,
	publicKey string,
) (string, error) {
	var username string
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT username FROM Players WHERE publicKey = ?",
		publicKey,
	).Scan(&username)
	return username, err
}

// GetPublicKeysByUsername returns all publicKeys with the given username.
func (mainDB *MainDB) GetPublicKeysByUsername(
	ctx context.Context,
	username string,
) ([]string, error) {
	rows, err := mainDB.Client.QueryContext(
		ctx,
		"SELECT publicKey FROM Players WHERE username = ?",
		username,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var keys []string
	for rows.Next() {
		var k string
		if err := rows.Scan(&k); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

// GetSkinID returns the skin ID of a player
func (mainDB *MainDB) GetSkinID(
	ctx context.Context,
	publicKey string,
) (uint8, error) {
	var skinID uint8
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT skinId FROM Players WHERE publicKey = ?",
		publicKey,
	).Scan(&skinID)
	return skinID, err
}

// SetSkinID sets the skin ID of a player
func (mainDB *MainDB) SetSkinID(
	ctx context.Context,
	publicKey string,
	skinID uint8,
) error {
	_, err := mainDB.Client.ExecContext(
		ctx,
		"UPDATE Players SET skinId = ? WHERE publicKey = ?",
		skinID,
		publicKey,
	)
	return err
}

// HasStreakAchievement returns the joined timestamp of the player and whether
// the play has the streak achievement
func (mainDB *MainDB) HasStreakAchievement(
	ctx context.Context,
	publicKey string,
) (int64, bool, error) {
	stats, err := mainDB.GetStatisticsMap(ctx, publicKey)
	if err != nil {
		return 0, false, err
	}
	joined := int64(stats["joined"].(float64))
	achievements := stats["achievements"].(map[string]any)
	streaks, ok := achievements["streaks"].([]any)
	return joined, ok && len(streaks) != 0, nil
}

// HasSkinAchievement returns whether a player has the skin achievement
func (mainDB *MainDB) HasSkinAchievement(
	ctx context.Context,
	publicKey string,
) (bool, error) {
	stats, err := mainDB.GetStatisticsMap(ctx, publicKey)
	if err != nil {
		return false, err
	}
	achievements := stats["achievements"].(map[string]any)
	skins, ok := achievements["skins"].([]any)
	return ok && len(skins) != 0, nil
}

// HasBlockAchievement returns whether a player has the block achievement
func (mainDB *MainDB) HasBlockAchievement(
	ctx context.Context,
	publicKey string,
) (bool, error) {
	stats, err := mainDB.GetStatisticsMap(ctx, publicKey)
	if err != nil {
		return false, err
	}
	achievements := stats["achievements"].(map[string]any)
	blocks, ok := achievements["blocks"].([]any)
	return ok && len(blocks) != 0, nil
}

// HasLinkAchievement returns whether a player has the link achievement
func (mainDB *MainDB) HasLinkAchievement(
	ctx context.Context,
	publicKey string,
) (bool, error) {
	stats, err := mainDB.GetStatisticsMap(ctx, publicKey)
	if err != nil {
		return false, err
	}
	achievements := stats["achievements"].(map[string]any)
	links, ok := achievements["links"].([]any)
	return ok && len(links) != 0, nil
}

// HasAllyAchievement returns whether a player has the ally achievement
func (mainDB *MainDB) HasAllyAchievement(
	ctx context.Context,
	publicKey string,
) (bool, error) {
	stats, err := mainDB.GetStatisticsMap(ctx, publicKey)
	if err != nil {
		return false, err
	}
	achievements := stats["achievements"].(map[string]any)
	ally, ok := achievements["ally"].([]any)
	return ok && len(ally) != 0, nil
}

// GetPlayerJoinedTimestamp returns the joined timestamp of a player
func (mainDB *MainDB) GetPlayerJoinedTimestamp(
	ctx context.Context,
	publicKey string,
) (int64, error) {
	var joined int64
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT JSON_EXTRACT(statistics, '$.joined') FROM Players "+
			"WHERE publicKey = ?",
		publicKey,
	).Scan(&joined)
	if err != nil {
		return 0, err
	}
	return joined, nil
}

// GetPlayerWithJoinedTimestamp returns the player associated with the
// joined timestamp
func (mainDB *MainDB) GetPlayerWithJoinedTimestamp(
	ctx context.Context,
	joined int64,
) (string, error) {
	var publicKey string
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT publicKey FROM Players "+
			"WHERE JSON_EXTRACT(statistics, '$.joined') = ?",
		joined,
	).Scan(&publicKey)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", nil
		}
		return "", err
	}
	return publicKey, nil
}

// AddReferral adds a referral relationship to the database
func (mainDB *MainDB) AddReferral(
	ctx context.Context,
	referrer string,
	referred string,
) error {
	_, err := mainDB.Client.ExecContext(
		ctx,
		"INSERT INTO Referrals (referrer, referred) VALUES (?, ?)",
		referrer,
		referred,
	)
	return err
}

type SelfReferral struct {
	Referrer  string `json:"referrer"`
	Succeeded bool   `json:"succeeded"`
}

type Referral struct {
	Referred  string `json:"referred"`
	Succeeded bool   `json:"succeeded"`
}

// GetSelfReferral returns the self referral of a player
func (mainDB *MainDB) GetSelfReferral(
	ctx context.Context,
	referred string,
) (SelfReferral, error) {
	var referrer string
	var succeeded bool
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT referrer, succeeded FROM Referrals WHERE referred = ?",
		referred,
	).Scan(&referrer, &succeeded)
	if err != nil {
		if err == sql.ErrNoRows {
			return SelfReferral{}, nil
		}
		return SelfReferral{}, err
	}
	return SelfReferral{
		Referrer:  referrer,
		Succeeded: succeeded,
	}, nil
}

// GetReferrals returns the referrals of a player
func (mainDB *MainDB) GetReferrals(
	ctx context.Context,
	referrer string,
) ([]Referral, error) {
	rows, err := mainDB.Client.QueryContext(
		ctx,
		"SELECT referred, succeeded FROM Referrals WHERE referrer = ?",
		referrer,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var referrals []Referral
	for rows.Next() {
		var referral Referral
		if err := rows.Scan(
			&referral.Referred, &referral.Succeeded,
		); err != nil {
			return nil, err
		}
		referrals = append(referrals, referral)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return referrals, nil
}

// IsReferred checks if a player referred another player
func (mainDB *MainDB) IsReferred(
	ctx context.Context,
	referred string,
) (string, bool, error) {
	var referrer string
	var succeeded bool
	err := mainDB.Client.QueryRowContext(
		ctx,
		"SELECT referrer, succeeded FROM Referrals WHERE referred = ?",
		referred,
	).Scan(&referrer, &succeeded)
	if err != nil {
		if err == sql.ErrNoRows {
			return "", false, nil
		}
		return "", false, err
	}
	return referrer, succeeded, nil
}

// SetReferralSucceeded flips succeeded 0 -> 1 and returns true if this
// call performed the flip.
func (mainDB *MainDB) SetReferralSucceeded(
	ctx context.Context,
	referred string,
) (bool, error) {
	res, err := mainDB.Client.ExecContext(
		ctx,
		"UPDATE Referrals SET succeeded = 1 "+
			"WHERE referred = ? AND succeeded = 0",
		referred,
	)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return n == 1, nil
}

// GetSucceededReferralsCount returns the count of succeeded referrals per
// player
func (mainDB *MainDB) GetSucceededReferralsCount(
	ctx context.Context,
) (map[string]int, error) {
	rows, err := mainDB.Client.QueryContext(
		ctx,
		"SELECT referrer, COUNT(*) FROM Referrals "+
			"WHERE succeeded = 1 GROUP BY referrer",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	referrals := make(map[string]int)
	for rows.Next() {
		var referrer string
		var count int
		if err := rows.Scan(&referrer, &count); err != nil {
			return nil, err
		}
		referrals[referrer] = count
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return referrals, nil
}
