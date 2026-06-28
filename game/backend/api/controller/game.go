package controller

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// GetPlace handle the request to get a place in the game
func (ctrl *Controller) GetPlace(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	// check if the player is banned
	isBanned, err := ctrl.MainDB.CheckIfBanned(c.Request.Context(), publicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "check banned", err)
		return
	}
	if isBanned {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	// check is the player is already in a game
	isConnected, err := ctrl.GameDB.GetPlayerIsConnected(
		c.Request.Context(),
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get player is-connected", err)
		return
	}
	if isConnected == 1 {
		// kick the player from the game
		err = ctrl.GameDB.PublishKickPlayer(c.Request.Context(), publicKey)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"publish kick player", err)
			return
		}
	}
	// get player data
	playerData, err := ctrl.MainDB.GetPlayerData(c.Request.Context(), publicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get player data", err)
		return
	}
	// check if the player set a username
	if playerData.Username == "" {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	// check if the player is suspended
	if playerData.SuspendedUntil != 0 {
		// get current unix time in seconds
		currentTime := time.Now().Unix()
		if playerData.SuspendedUntil > currentTime {
			c.AbortWithStatus(http.StatusForbidden)
			return
		} else {
			// no more suspended
			playerData.SuspendedUntil = 0
			// reset the HP of the player
			skillValue := ctrl.MainDB.Skills.Health.GetSkillValue(
				playerData.HealthLevel,
			)
			playerData.HP = skillValue
			// update main database
			err = ctrl.MainDB.UpdatePlayerData(c.Request.Context(), playerData)
			if err != nil {
				abortErr(c, http.StatusInternalServerError,
					"clear suspension: update main db", err)
				return
			}
			// update game database
			err = ctrl.GameDB.UpdatePlayerData(
				c.Request.Context(),
				publicKey,
				map[string]any{"hp": skillValue},
			)
			if err != nil {
				abortErr(c, http.StatusInternalServerError,
					"clear suspension: update game db", err)
				return
			}
		}
	}
	// check the game servers status
	status, err := ctrl.GameDB.GetGameServersStatus(c.Request.Context())
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get game servers status", err)
		return
	}
	if status == "closed" {
		// add the player to the game queue
		pos, err := ctrl.GameDB.AddPlayerToQueue(c.Request.Context(), publicKey)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"add player to queue (closed)", err)
			return
		}
		c.JSON(http.StatusAccepted, gin.H{
			"position": pos,
		})
		return
	}
	// get servers players counts
	ctrl.GameDBServersPlayersCountsMutex.Lock()
	defer ctrl.GameDBServersPlayersCountsMutex.Unlock()
	serversPlayersCounts, err := ctrl.GameDB.GetServersPlayersCounts(
		c.Request.Context(),
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get servers players counts", err)
		return
	}
	tmpServersPlayersCounts, err := ctrl.Cache.GetServersTempPlayersCounts(
		c.Request.Context(),
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"get servers temp players counts", err)
		return
	}
	for i := range serversPlayersCounts {
		if v, ok := tmpServersPlayersCounts[i]; ok {
			serversPlayersCounts[i] += v
		}
	}
	// find the server with the least players
	minPlayers := ctrl.MAX_PLAYERS_PER_GAME_SERVER
	serverId := 0
	for i := range serversPlayersCounts {
		if serversPlayersCounts[i] < minPlayers {
			minPlayers = serversPlayersCounts[i]
			serverId = i
		}
	}
	// check if the server is full
	if minPlayers >= ctrl.MAX_PLAYERS_PER_GAME_SERVER {
		// change the game servers status to closed
		err := ctrl.GameDB.SetGameServersStatus(c.Request.Context(), "closed")
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"set game servers status closed", err)
			return
		}
		// add the player to the game queue
		pos, err := ctrl.GameDB.AddPlayerToQueue(c.Request.Context(), publicKey)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"add player to queue (full)", err)
			return
		}
		c.JSON(http.StatusAccepted, gin.H{
			"position": pos,
		})
		return
	}
	// update temporary players count
	err = ctrl.Cache.AddTempPlayerToServer(
		c.Request.Context(),
		serverId,
		publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"add temp player to server", err,
			"serverId", serverId,
		)
		return
	}
	// insert the server id in the game database
	err = ctrl.GameDB.UpdatePlayerData(
		c.Request.Context(),
		publicKey,
		map[string]any{"serverId": serverId},
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"update player server id", err,
			"serverId", serverId,
		)
		return
	}
	// respond to the player with the server id
	c.JSON(http.StatusOK, gin.H{
		"serverId":   serverId,
		"playerData": playerData,
	})
}

// DeleteQueue handle the request to delete the player from the game queue
func (ctrl *Controller) DeleteQueue(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	err := ctrl.GameDB.RemovePlayerFromQueue(c.Request.Context(), publicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"remove player from queue", err)
		return
	}
}
