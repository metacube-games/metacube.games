package controller

import (
	"backend/blockchain"
	"backend/internal/constants"
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"slices"

	"github.com/gin-gonic/gin"
)

// GetPlayerData returns the player data
func (ctrl *Controller) GetPlayerData(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	playerData, err := ctrl.MainDB.GetPlayerData(c.Request.Context(), publicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get player data", err)
		return
	}
	c.JSON(http.StatusOK, playerData)
}

type SetUsernameReqBody struct {
	Username string `json:"username"`
}

// SetUsername sets the username of the player
func (ctrl *Controller) SetUsername(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	// decode request body
	decoder := json.NewDecoder(c.Request.Body)
	var body SetUsernameReqBody
	err := decoder.Decode(&body)
	if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	exists, err := ctrl.MainDB.UsernameAlreadyExists(
		c.Request.Context(),
		publicKey,
		body.Username,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"check username exists", err)
		return
	}
	if exists {
		c.AbortWithStatus(http.StatusConflict)
		return
	}
	err = ctrl.MainDB.UpdateUsername(
		c.Request.Context(),
		publicKey,
		body.Username,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"update username (main db)", err)
		return
	}
	err = ctrl.GameDB.UpdatePlayerData(
		c.Request.Context(),
		publicKey,
		map[string]any{"username": body.Username},
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"update username (game db)", err)
		return
	}
}

// GetStarknetID returns the stark name of the player if it exists
func (ctrl *Controller) GetStarknetID(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	starkname, err := ctrl.StarknetController.StarknetIDClient.GetStarkName(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get stark name", err)
		return
	}
	err = ctrl.Cache.SaveStarknetID(c.Request.Context(), publicKey, starkname)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"save starknet id to cache", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"starkname": starkname})
}

type SetStarknetIDReqBody struct {
	Starkname string `json:"starkname"`
}

// SetStarknetID sets the stark name of the player
func (ctrl *Controller) SetStarknetID(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	// decode request body
	decoder := json.NewDecoder(c.Request.Body)
	var body SetStarknetIDReqBody
	err := decoder.Decode(&body)
	if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	savedStarkname, err := ctrl.Cache.GetStarknetID(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get cached starknet id", err)
		return
	}
	if savedStarkname != body.Starkname {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	err = ctrl.MainDB.UpdateUsername(
		c.Request.Context(),
		publicKey,
		body.Starkname,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"update username from starkname (main db)", err)
		return
	}
	err = ctrl.GameDB.UpdatePlayerData(
		c.Request.Context(),
		publicKey,
		map[string]any{"username": body.Starkname},
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"update username from starkname (game db)", err)
		return
	}
}

// GetStatistics returns the statistics of a player
func (ctrl *Controller) GetStatistics(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	statistics, err := ctrl.MainDB.GetStatistics(c.Request.Context(), publicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get statistics", err)
		return
	}
	c.JSON(http.StatusOK, statistics)
}

// GetRewardAddress returns the reward address of the Google or guest player
func (ctrl *Controller) GetRewardAddress(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	rewardAddress, err := ctrl.MainDB.GetRewardAddress(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get reward address", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"address": rewardAddress})
}

type SetRewardReqBody struct {
	Address string `json:"address"`
}

// SetRewardAddress sets the rewards of the Google or guest player to the
// given address.
func (ctrl *Controller) SetRewardAddress(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	if !strings.HasPrefix(publicKey, "google") &&
		!strings.HasPrefix(publicKey, "guest") {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	// check if the player has already set a reward address
	rewardAddress, err := ctrl.MainDB.GetRewardAddress(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get existing reward address", err)
		return
	}
	if rewardAddress != "" {
		c.AbortWithStatus(http.StatusConflict)
		return
	}
	// decode request body
	decoder := json.NewDecoder(c.Request.Body)
	var body SetRewardReqBody
	err = decoder.Decode(&body)
	if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	address := strings.TrimPrefix(body.Address, "0x")
	if len(address) < 64 {
		// add 0s to the beginning of the address
		address = strings.Repeat("0", 64-len(address)) + address
	} else if len(address) > 64 {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	err = ctrl.MainDB.UpdateRewardAddress(
		c.Request.Context(),
		publicKey,
		address,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"update reward address", err)
		return
	}
	nftIDs, err := ctrl.MainDB.GetNotSentNFTsForPlayer(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get not-sent nfts for player", err)
		return
	}
	if len(nftIDs) == 0 {
		// no NFTs to send
		c.AbortWithStatus(http.StatusOK)
		return
	}
	for _, v := range nftIDs {
		ctrl.StarknetController.TxChan <- blockchain.NFT_tx{
			To:      address,
			TokenID: v - 1,
		}
	}
	err = ctrl.MainDB.MarkNFTsOfPlayerAsSent(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "mark nfts as sent", err)
		return
	}
}

// GetNFTs returns the NFTs of a player in the game
func (ctrl *Controller) GetNFTsForPlayer(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	count, err := ctrl.MainDB.GetNFTCountForPlayer(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get nft count for player", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (ctrl *Controller) GetSkinsForPlayer(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	var address string
	if strings.HasPrefix(publicKey, "google") ||
		strings.HasPrefix(publicKey, "guest") {
		rewardAddress, err := ctrl.MainDB.GetRewardAddress(
			c.Request.Context(),
			publicKey,
		)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"get reward address for skins lookup", err)
			return
		}
		address = rewardAddress
	} else {
		address = publicKey
	}
	if address == "" {
		c.JSON(http.StatusOK, gin.H{
			"selected": 0,
			"skins":    []uint{0},
		})
		return
	}
	skins, err := ctrl.StarknetController.GetSkins(
		c.Request.Context(),
		address,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get skins from starknet", err,
			"address", address,
		)
		return
	}
	selectedSkin, err := ctrl.MainDB.GetSkinID(c.Request.Context(), publicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get selected skin id", err)
		return
	}
	if !slices.Contains(skins, selectedSkin) {
		selectedSkin = 0
	}
	uintSkins := make([]uint, len(skins))
	for i, skin := range skins {
		uintSkins[i] = uint(skin)
	}
	c.JSON(http.StatusOK, gin.H{
		"selected": selectedSkin,
		"skins":    uintSkins,
	})
}

type SetDefaultSkinReqBody struct {
	Skin uint `json:"skin"`
}

func (ctrl *Controller) SetSkinForPlayer(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	// decode request body
	decoder := json.NewDecoder(c.Request.Body)
	var body SetDefaultSkinReqBody
	err := decoder.Decode(&body)
	if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	var address string
	if strings.HasPrefix(publicKey, "google") ||
		strings.HasPrefix(publicKey, "guest") {
		rewardAddress, err := ctrl.MainDB.GetRewardAddress(
			c.Request.Context(),
			publicKey,
		)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"get reward address for skin set", err)
			return
		}
		address = rewardAddress
	} else {
		address = publicKey
	}
	if address == "" {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	// verify that the player has the skin
	var ok bool
	if ok, err = ctrl.VerifySkinForPlayer(
		c.Request.Context(),
		address,
		uint8(body.Skin),
	); err != nil {
		abortErr(c, http.StatusInternalServerError,
			"verify skin ownership", err,
			"skin", body.Skin,
		)
		return
	}
	if !ok {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	err = ctrl.MainDB.SetSkinID(
		c.Request.Context(),
		publicKey,
		uint8(body.Skin),
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"set skin id", err,
			"skin", body.Skin,
		)
		return
	}
	playerData, err := ctrl.MainDB.GetPlayerData(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get player data after skin set", err)
		return
	}
	// adjust for skin advantages
	multiplier := ctrl.MainDB.Skills.Multiplier.
		Levels[playerData.MultiplierLevel-1].Value
	criticalHit := ctrl.MainDB.Skills.CriticalHit.
		Levels[playerData.CriticalHitLevel-1].Value
	switch playerData.SkinId {
	case blockchain.GENESIS_SKIN_ID:
		multiplier += 10
		criticalHit += 2
	case blockchain.BROTHER_SKIN_ID:
		criticalHit += 2
	}
	err = withGameDBRetry(func() error {
		return ctrl.GameDB.UpdatePlayerData(
			c.Request.Context(),
			publicKey,
			map[string]any{
				"skin":        body.Skin,
				"multiplier":  multiplier,
				"criticalHit": criticalHit,
			},
		)
	})
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"update game db after skin set", err)
		return
	}
	go ctrl.setSkinAchievement(publicKey)
}

func (ctrl *Controller) VerifySkinForPlayer(
	ctx context.Context,
	publicKey string,
	skin uint8,
) (bool, error) {
	skins, err := ctrl.StarknetController.GetSkins(
		ctx,
		publicKey,
	)
	if err != nil {
		return false, err
	}
	if !slices.Contains(skins, skin) {
		return false, nil
	}
	return true, nil
}

func (ctrl *Controller) setSkinAchievement(publicKey string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	achieved, err := ctrl.MainDB.HasSkinAchievement(
		ctx,
		publicKey,
	)
	if err != nil || achieved {
		return
	}
	payload := bytes.Buffer{}
	payload.WriteByte(byte(constants.DBManagerSkinType))
	payload.WriteString(publicKey)
	ctrl.AchievementsChan <- payload.Bytes()
}

func (ctrl *Controller) GetReferralCode(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	joined, err := ctrl.MainDB.GetPlayerJoinedTimestamp(
		c.Request.Context(), publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get player joined timestamp", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"code": joined,
	})
}

func (ctrl *Controller) GetReferralInvites(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	selfReferral, err := ctrl.MainDB.GetSelfReferral(
		c.Request.Context(), publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get self referral", err)
		return
	}
	referrals, err := ctrl.MainDB.GetReferrals(c.Request.Context(), publicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get referrals", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"selfReferral": selfReferral,
		"referrals":    referrals,
	})
}

func (ctrl *Controller) GetPlayerCoins(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	coins, err := ctrl.MainDB.GetPlayerCoins(c.Request.Context(), publicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get player coins", err)
		return
	}
	c.JSON(http.StatusOK, coins)
}
