package controller

import (
	"backend/blockchain"
	"backend/databases/game"
	"backend/internal/constants"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/api/idtoken"
)

// Claim sends a few STRK tokens to the player
func (ctrl *Controller) Claim(c *gin.Context) {
	publicKey := c.Request.URL.Query().Get("publicKey")
	publicKey = strings.TrimPrefix(publicKey, "0x")
	if len(publicKey) > 64 {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	publicKey = strings.Repeat("0", 64-len(publicKey)) + publicKey
	// Atomically reserve the claim. Two concurrent requests for the same
	// publicKey would both pass a separate check-then-record sequence and
	// trigger two STRK transfers; SETNX collapses that to one winner.
	acquired, err := ctrl.Cache.ClaimAddressOnce(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "claim address", err)
		return
	}
	if !acquired {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	// Send the tokens. If the channel is full (batcher wedged), undo the
	// reservation so the user can retry later instead of being permanently
	// blocked.
	select {
	case ctrl.StarknetController.ClaimChan <- publicKey:
	default:
		_ = ctrl.Cache.DeleteClaimAddress(c.Request.Context(), publicKey)
		c.AbortWithStatus(http.StatusServiceUnavailable)
		return
	}
}

type Claims struct {
	PublicKey string `json:"publicKey"`
	jwt.RegisteredClaims
}

// GetNonce handles the request for a new nonce
func (ctrl *Controller) GetNonce(c *gin.Context) {
	publicKey := c.Request.URL.Query().Get("publicKey")
	// check if the player is banned
	isBanned, err := ctrl.MainDB.CheckIfBanned(c.Request.Context(), publicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "check banned (nonce)", err)
		return
	}
	if isBanned {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	// generate nonce
	newNonce := strconv.FormatInt(time.Now().UnixNano(), 10)
	// save nonce in cache
	err = ctrl.Cache.SaveNonce(c.Request.Context(), publicKey, newNonce)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "save nonce", err)
		return
	}
	// respond to the player with the nonce
	c.JSON(http.StatusOK, gin.H{
		"nonce": newNonce,
	})
}

// GetGuestID handles the request for a new guest ID
func (ctrl *Controller) GetGuestID(c *gin.Context) {
	// verify IP address
	count, err := ctrl.Cache.RegisterIPAddress(
		c.Request.Context(),
		c.ClientIP(),
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"register ip for guest", err)
		return
	}
	if count > 6 {
		c.AbortWithStatus(http.StatusTooManyRequests)
		return
	}
	// generate guest ID
	guestID := strconv.FormatInt(time.Now().UnixNano(), 10)
	// save guest ID in cache
	err = ctrl.Cache.SaveGuestID(c.Request.Context(), guestID)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "save guest id", err)
		return
	}
	// respond to the player with the guest ID
	c.JSON(http.StatusOK, gin.H{
		"guestId": guestID,
	})
}

type ConnectReqBody struct {
	PublicKey    string   `json:"publicKey"`
	Signature    []string `json:"signature"`
	ReferralCode int64    `json:"referralCode,omitempty"`
}

type ConnectReqBodyGoogle struct {
	Credential   string `json:"credential"`
	ReferralCode int64  `json:"referralCode,omitempty"`
}

type ConnectReqBodyGuest struct {
	GuestID      string `json:"guestId"`
	ReferralCode int64  `json:"referralCode,omitempty"`
}

// Connect handles the connection of a player
// connectIdentity is the resolved auth result from one of the login flows
// (Starknet wallet, Google, or guest).
type connectIdentity struct {
	publicKey     string
	name          string
	email         string
	rewardAddress string
	referralCode  int64
	isExternal    bool
}

func (ctrl *Controller) Connect(c *gin.Context) {
	useGoogle := c.Request.URL.Query().Get("google") == "true"
	useGuest := c.Request.URL.Query().Get("guest") == "true"
	useCartridge := c.Request.URL.Query().Get("cartridge") == "true"

	var id *connectIdentity
	switch {
	case useGoogle:
		id = ctrl.handleGoogleLogin(c)
	case useGuest:
		id = ctrl.handleGuestLogin(c)
	default:
		id = ctrl.handleStarknetLogin(c, useCartridge)
	}
	if id == nil {
		return
	}
	publicKey := id.publicKey
	rewardAddress := id.rewardAddress
	name := id.name
	email := id.email
	referralCode := id.referralCode
	// retrieve player data from the database
	exists := true
	playerData, err := ctrl.MainDB.GetPlayerData(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			// add new player to the database
			playerData, err = ctrl.MainDB.AddNewPlayer(
				c.Request.Context(),
				publicKey,
				name,
				email,
				rewardAddress,
			)
			if err != nil {
				abortErr(c, http.StatusInternalServerError,
					"add new player", err)
				return
			}
			exists = false
			// add referral relationship if any
			if referralCode != 0 {
				referrer, err := ctrl.MainDB.GetPlayerWithJoinedTimestamp(
					c.Request.Context(),
					referralCode,
				)
				if err != nil {
					abortErr(c, http.StatusInternalServerError,
						"get referrer by joined timestamp", err,
						"referralCode", referralCode,
					)
					return
				}
				if referrer != "" {
					err = ctrl.MainDB.AddReferral(
						c.Request.Context(),
						referrer,
						publicKey,
					)
					if err != nil {
						abortErr(c, http.StatusInternalServerError,
							"add referral", err)
						return
					}
				}
			}
		} else {
			abortErr(c, http.StatusInternalServerError,
				"get player data (connect)", err)
			return
		}
	}
	// kick the player from the game
	if !ctrl.Inter {
		err = ctrl.GameDB.PublishKickPlayer(c.Request.Context(), publicKey)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"publish kick player (connect)", err)
			return
		}
	}
	// reset the HP of the player if 0
	if playerData.HP == 0 {
		playerData.HP = ctrl.MainDB.Skills.Health.GetSkillValue(
			playerData.HealthLevel,
		)
		// update main database
		err = ctrl.MainDB.UpdatePlayerData(c.Request.Context(), playerData)
		if err != nil {
			abortErr(c, http.StatusInternalServerError, "reset player hp", err)
			return
		}
	}
	// verify that the player has the skin
	multiplier := ctrl.MainDB.Skills.Multiplier.
		Levels[playerData.MultiplierLevel-1].Value
	criticalHit := ctrl.MainDB.Skills.CriticalHit.
		Levels[playerData.CriticalHitLevel-1].Value
	var address string
	if id.isExternal {
		address = playerData.RewardAddress
	} else {
		address = publicKey
	}
	if address != "" {
		var ok bool
		if ok, err = ctrl.VerifySkinForPlayer(
			c.Request.Context(),
			address,
			uint8(playerData.SkinId),
		); err != nil {
			abortErr(c, http.StatusInternalServerError,
				"verify skin (connect)", err)
			return
		}
		if !ok {
			playerData.SkinId = 0
			// update main database
			err = ctrl.MainDB.SetSkinID(
				c.Request.Context(),
				playerData.PublicKey,
				uint8(playerData.SkinId),
			)
			if err != nil {
				abortErr(c, http.StatusInternalServerError,
					"reset skin id (connect)", err)
				return
			}
		}
		// adjust for skin advantages
		switch playerData.SkinId {
		case blockchain.GENESIS_SKIN_ID:
			multiplier += 10
			criticalHit += 2
		case blockchain.BROTHER_SKIN_ID:
			criticalHit += 2
		}
	}
	// add player to the game database
	player := &game.Player{
		PublicKey:   publicKey,
		IsConnected: 0,
		ServerId:    -1,
		Username:    playerData.Username,
		HP:          playerData.HP,
		MaxHP: ctrl.MainDB.
			Skills.Health.Levels[playerData.HealthLevel-1].Value,
		Damage: ctrl.MainDB.
			Skills.Damage.Levels[playerData.DamageLevel-1].Value,
		Multiplier:  multiplier,
		CriticalHit: criticalHit,
		SkinId:      playerData.SkinId,
	}
	if !ctrl.Inter {
		err = ctrl.GameDB.InsertPlayerData(c.Request.Context(), player)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"insert player into game db", err)
			return
		}
	}
	// create a new access token
	accessTokenExpirationTime := time.Now().Add(time.Minute * 5)
	accessTokenClaims := &Claims{
		PublicKey: publicKey,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(accessTokenExpirationTime),
		},
	}
	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessTokenClaims)
	accessTokenString, err := accessToken.SignedString(
		[]byte(ctrl.EnvFile["BACKEND_API_JWT_KEY"]),
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"sign access token (connect)", err)
		return
	}
	// create a new refresh token
	refreshTokenExpirationTime := time.Now().Add(time.Hour * 24)
	refreshTokenClaims := &Claims{
		PublicKey: publicKey,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(refreshTokenExpirationTime),
		},
	}
	refreshToken := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		refreshTokenClaims,
	)
	refreshTokenString, err := refreshToken.SignedString(
		[]byte(ctrl.EnvFile["BACKEND_API_JWT_KEY"]),
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"sign refresh token (connect)", err)
		return
	}
	// save refresh token
	err = ctrl.Cache.SaveRefreshToken(
		c.Request.Context(),
		publicKey,
		refreshTokenString,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"save refresh token (connect)", err)
		return
	}
	// add the refresh token in cookie
	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie(
		"refreshToken",
		refreshTokenString,
		24*3600,
		"/",
		"",
		true,
		true,
	)
	// set streak achievement
	go ctrl.setStreakAchievement(publicKey)
	// create a new chat token
	if !ctrl.Inter {
		chatTokenExpirationTime := time.Now().Add(time.Minute * 1)
		chatTokenClaims := &Claims{
			PublicKey: publicKey,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(chatTokenExpirationTime),
			},
		}
		chatToken := jwt.NewWithClaims(jwt.SigningMethodHS256, chatTokenClaims)
		chatTokenString, err := chatToken.SignedString(
			[]byte(ctrl.EnvFile["BACKEND_API_JWT_KEY"]),
		)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"sign chat token (connect)", err)
			return
		}
		// save chat token
		err = ctrl.Cache.SaveChatToken(
			c.Request.Context(),
			publicKey,
			chatTokenString,
		)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"save chat token (connect)", err)
			return
		}
		// respond to the client with the data
		c.JSON(http.StatusOK, gin.H{
			"accessToken": accessTokenString,
			"playerData":  playerData,
			"firstTime":   !exists,
			"chatToken":   chatTokenString,
		})
	} else {
		// respond to the client with the data without chat token
		c.JSON(http.StatusOK, gin.H{
			"accessToken": accessTokenString,
			"playerData":  playerData,
			"firstTime":   !exists,
		})
	}
}

// Refresh handles the request for a new access token
func (ctrl *Controller) Refresh(c *gin.Context) {
	reconnect := c.Request.URL.Query().Get("reconnect")
	// get the refresh token from cookie
	refreshToken, err := c.Request.Cookie("refreshToken")
	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	// verify token
	refreshTokenString := refreshToken.Value
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(
		refreshTokenString,
		claims,
		func(token *jwt.Token) (any, error) {
			// Pin to HS256; see middlewares/verifyJWT.go for the rationale.
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf(
					"unexpected signing method: %v", token.Header["alg"],
				)
			}
			return []byte(ctrl.EnvFile["BACKEND_API_JWT_KEY"]), nil
		},
	)
	if err != nil || !token.Valid {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	savedToken, err := ctrl.Cache.GetRefreshToken(
		c.Request.Context(),
		claims.PublicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get refresh token from cache", err)
		return
	}
	if savedToken != refreshTokenString {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	// retrieve player data from the database
	playerData, err := ctrl.MainDB.GetPlayerData(
		c.Request.Context(),
		claims.PublicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get player data (refresh)", err)
		return
	}
	// check is the player is already in a game
	var isConnected int
	if !ctrl.Inter {
		isConnected, err = ctrl.GameDB.GetPlayerIsConnected(
			c.Request.Context(),
			playerData.PublicKey,
		)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"get player is-connected (refresh)", err)
			return
		}
	}
	// reset the HP of the player if 0
	if playerData.HP == 0 {
		playerData.HP = ctrl.MainDB.Skills.Health.GetSkillValue(
			playerData.HealthLevel,
		)
		// update main database
		err = ctrl.MainDB.UpdatePlayerData(c.Request.Context(), playerData)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"reset player hp (refresh)", err)
			return
		}
	}
	// add player to the game database if not already there
	if !ctrl.Inter {
		if reconnect == "true" {
			// verify that the player has the skin
			multiplier := ctrl.MainDB.Skills.Multiplier.
				Levels[playerData.MultiplierLevel-1].Value
			criticalHit := ctrl.MainDB.Skills.CriticalHit.
				Levels[playerData.CriticalHitLevel-1].Value
			var address string
			if strings.HasPrefix(playerData.PublicKey, "google") ||
				strings.HasPrefix(playerData.PublicKey, "guest") {
				address = playerData.RewardAddress
			} else {
				address = playerData.PublicKey
			}
			if address != "" {
				var ok bool
				if ok, err = ctrl.VerifySkinForPlayer(
					c.Request.Context(),
					address,
					uint8(playerData.SkinId),
				); err != nil {
					abortErr(c, http.StatusInternalServerError,
						"verify skin (refresh)", err)
					return
				}
				if !ok {
					playerData.SkinId = 0
					// update main database
					err = ctrl.MainDB.SetSkinID(
						c.Request.Context(),
						playerData.PublicKey,
						uint8(playerData.SkinId),
					)
					if err != nil {
						abortErr(c, http.StatusInternalServerError,
							"reset skin id (refresh)", err)
						return
					}
				}
				// adjust for skin advantages
				switch playerData.SkinId {
				case blockchain.GENESIS_SKIN_ID:
					multiplier += 10
					criticalHit += 2
				case blockchain.BROTHER_SKIN_ID:
					criticalHit += 2
				}
			}
			if isConnected == 0 {
				player := &game.Player{
					PublicKey:   playerData.PublicKey,
					IsConnected: 0,
					ServerId:    -1,
					Username:    playerData.Username,
					HP:          playerData.HP,
					MaxHP: ctrl.MainDB.Skills.
						Health.Levels[playerData.HealthLevel-1].Value,
					Damage: ctrl.MainDB.Skills.
						Damage.Levels[playerData.DamageLevel-1].Value,
					Multiplier:  multiplier,
					CriticalHit: criticalHit,
					SkinId:      playerData.SkinId,
				}
				err = ctrl.GameDB.InsertPlayerData(c.Request.Context(), player)
				if err != nil {
					abortErr(c, http.StatusInternalServerError,
						"insert player into game db (refresh)", err)
					return
				}
			} else {
				// kick the player from the game
				err = ctrl.GameDB.PublishKickPlayer(
					c.Request.Context(),
					playerData.PublicKey,
				)
				if err != nil {
					abortErr(c, http.StatusInternalServerError,
						"publish kick player (refresh)", err)
					return
				}
			}
		}
	}
	// create a new access token
	newAccessTokenExpirationTime := time.Now().Add(time.Minute * 5)
	newAccessTokenClaims := &Claims{
		PublicKey: claims.PublicKey,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(newAccessTokenExpirationTime),
		},
	}
	newAccessToken := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		newAccessTokenClaims,
	)
	newAccessTokenString, err := newAccessToken.SignedString(
		[]byte(ctrl.EnvFile["BACKEND_API_JWT_KEY"]),
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"sign access token (refresh)", err)
		return
	}
	// create a new refresh token
	newRefreshTokenExpirationTime := time.Now().Add(time.Hour * 24)
	newRefreshTokenClaims := &Claims{
		PublicKey: claims.PublicKey,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(newRefreshTokenExpirationTime),
		},
	}
	newRefreshToken := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		newRefreshTokenClaims,
	)
	newRefreshTokenString, err := newRefreshToken.SignedString(
		[]byte(ctrl.EnvFile["BACKEND_API_JWT_KEY"]),
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"sign refresh token (refresh)", err)
		return
	}
	rotated, err := ctrl.Cache.RotateRefreshToken(
		c.Request.Context(),
		claims.PublicKey,
		refreshTokenString,
		newRefreshTokenString,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"rotate refresh token (refresh)", err)
		return
	}
	if !rotated {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	// add the refresh token in cookie
	c.SetSameSite(http.SameSiteNoneMode)
	c.SetCookie(
		"refreshToken",
		newRefreshTokenString,
		24*3600,
		"/",
		"",
		true,
		true,
	)
	// set streak achievement
	if reconnect == "true" {
		go ctrl.setStreakAchievement(claims.PublicKey)
	}
	// create a new chat token
	if !ctrl.Inter && reconnect == "true" {
		chatTokenExpirationTime := time.Now().Add(time.Minute * 1)
		chatTokenClaims := &Claims{
			PublicKey: claims.PublicKey,
			RegisteredClaims: jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(chatTokenExpirationTime),
			},
		}
		chatToken := jwt.NewWithClaims(jwt.SigningMethodHS256, chatTokenClaims)
		chatTokenString, err := chatToken.SignedString(
			[]byte(ctrl.EnvFile["BACKEND_API_JWT_KEY"]),
		)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"sign chat token (refresh)", err)
			return
		}
		// save chat token
		err = ctrl.Cache.SaveChatToken(
			c.Request.Context(),
			claims.PublicKey,
			chatTokenString,
		)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"save chat token (refresh)", err)
			return
		}
		// respond to the client with the data
		c.JSON(http.StatusOK, gin.H{
			"accessToken": newAccessTokenString,
			"playerData":  playerData,
			"chatToken":   chatTokenString,
		})
	} else {
		// respond to the client with the data without chat token
		c.JSON(http.StatusOK, gin.H{
			"accessToken": newAccessTokenString,
			"playerData":  playerData,
		})
	}
}

// Disconnect handles the disconnection of a player
func (ctrl *Controller) Disconnect(c *gin.Context) {
	// get the refresh token from cookie
	refreshToken, err := c.Request.Cookie("refreshToken")
	if err != nil {
		c.AbortWithStatus(http.StatusNoContent)
		return
	}
	// invalidate the cookie
	c.SetCookie("refreshToken", "", -1, "/", "", true, true)
	// verify token
	refreshTokenString := refreshToken.Value
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(
		refreshTokenString,
		claims,
		func(token *jwt.Token) (any, error) {
			// Pin to HS256; see middlewares/verifyJWT.go for the rationale.
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf(
					"unexpected signing method: %v", token.Header["alg"],
				)
			}
			return []byte(ctrl.EnvFile["BACKEND_API_JWT_KEY"]), nil
		},
	)
	if err != nil || !token.Valid {
		c.AbortWithStatus(http.StatusNoContent)
		return
	}
	// get saved token from cache
	savedToken, err := ctrl.Cache.GetRefreshToken(
		c.Request.Context(),
		claims.PublicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get refresh token (disconnect)", err)
		return
	}
	// verify that the saved token is the same as the one in the cookie
	if savedToken != refreshTokenString {
		c.AbortWithStatus(http.StatusNoContent)
		return
	}
	// delete the refresh token from cache
	err = ctrl.Cache.DeleteRefreshToken(c.Request.Context(), claims.PublicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"delete refresh token (disconnect)", err)
		return
	}
	if !ctrl.Inter {
		// kick the player from the game
		err = ctrl.GameDB.PublishKickPlayer(
			c.Request.Context(), claims.PublicKey,
		)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"publish kick player (disconnect)", err)
			return
		}
		// remove player from the game database
		err = ctrl.GameDB.RemovePlayerData(
			c.Request.Context(), claims.PublicKey,
		)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"remove player data (disconnect)", err)
			return
		}
		// make sure that the player is removed from the game queue
		err = ctrl.GameDB.RemovePlayerFromQueue(
			c.Request.Context(),
			claims.PublicKey,
		)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"remove player from queue (disconnect)", err)
			return
		}
	}
}

func (ctrl *Controller) setStreakAchievement(publicKey string) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	joined, achieved, err := ctrl.MainDB.HasStreakAchievement(
		ctx,
		publicKey,
	)
	if err != nil || achieved {
		return
	}
	now := time.Now().Unix()
	// at least 24 hours have passed since the player joined
	if now-joined >= 24*3600 {
		payload := bytes.Buffer{}
		payload.WriteByte(byte(constants.DBManagerStreakType))
		payload.WriteString(publicKey)
		ctrl.AchievementsChan <- payload.Bytes()
	}
}

// handleGoogleLogin verifies a Google ID token and returns the resolved
// identity. Returns nil after writing the appropriate error response.
func (ctrl *Controller) handleGoogleLogin(c *gin.Context) *connectIdentity {
	decoder := json.NewDecoder(c.Request.Body)
	var body ConnectReqBodyGoogle
	if err := decoder.Decode(&body); err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return nil
	}
	payload, err := idtoken.Validate(
		c.Request.Context(),
		body.Credential,
		ctrl.EnvFile["BACKEND_API_GOOGLE_CLIENT_ID"],
	)
	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return nil
	}
	// create fake public key
	publicKey := "google"
	lenZeroes := 64 - len(publicKey) - len(payload.Subject) - 2
	for range lenZeroes {
		publicKey += "0"
	}
	publicKey += "id" + payload.Subject
	name, _ := payload.Claims["name"].(string)
	email, _ := payload.Claims["email"].(string)
	if email == "" {
		c.AbortWithStatus(http.StatusUnauthorized)
		return nil
	}
	return &connectIdentity{
		publicKey:    publicKey,
		name:         name,
		email:        email,
		referralCode: body.ReferralCode,
		isExternal:   true,
	}
}

// handleGuestLogin validates a guest session and returns the resolved
// identity. Returns nil after writing the appropriate error response.
func (ctrl *Controller) handleGuestLogin(c *gin.Context) *connectIdentity {
	decoder := json.NewDecoder(c.Request.Body)
	var body ConnectReqBodyGuest
	if err := decoder.Decode(&body); err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return nil
	}
	exists, err := ctrl.Cache.ExistGuestID(c.Request.Context(), body.GuestID)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"check guest id exists", err)
		return nil
	}
	if !exists {
		c.AbortWithStatus(http.StatusBadRequest)
		return nil
	}
	// create fake public key
	publicKey := "guest"
	lenZeroes := 64 - len(publicKey) - len(body.GuestID) - 2
	for range lenZeroes {
		publicKey += "0"
	}
	publicKey += "id" + body.GuestID
	return &connectIdentity{
		publicKey:    publicKey,
		referralCode: body.ReferralCode,
		isExternal:   true,
	}
}

// handleStarknetLogin verifies the Starknet signature (skipped for Cartridge
// flows) and returns the resolved identity. Returns nil after writing the
// appropriate error response.
func (ctrl *Controller) handleStarknetLogin(
	c *gin.Context, useCartridge bool,
) *connectIdentity {
	decoder := json.NewDecoder(c.Request.Body)
	var body ConnectReqBody
	if err := decoder.Decode(&body); err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return nil
	}
	nonce, err := ctrl.Cache.GetNonce(c.Request.Context(), body.PublicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get nonce", err)
		return nil
	}
	if !useCartridge {
		isValid, err := ctrl.StarknetController.VerifySignatures(
			c.Request.Context(),
			body.PublicKey,
			fmt.Sprintf("timestamp: %s", nonce),
			body.Signature,
		)
		if err != nil {
			if err.Error() == "contract not found" {
				c.AbortWithStatus(http.StatusNotFound)
				return nil
			}
			abortErr(c, http.StatusInternalServerError,
				"verify starknet signature", err)
			return nil
		}
		if !isValid {
			c.AbortWithStatus(http.StatusUnauthorized)
			return nil
		}
	}
	return &connectIdentity{
		publicKey:     body.PublicKey,
		rewardAddress: body.PublicKey,
		referralCode:  body.ReferralCode,
	}
}
