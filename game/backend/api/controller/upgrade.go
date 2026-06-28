package controller

import (
	"bytes"
	"encoding/json"
	"net/http"

	"backend/internal/constants"

	"github.com/gin-gonic/gin"
)

type UpdateReqBody struct {
	Skill string `json:"skill"`
}

const MAX_LEVEL = 7

// Upgrade handles the upgrade request
func (ctrl *Controller) Upgrade(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	// decode request body
	decoder := json.NewDecoder(c.Request.Body)
	var body UpdateReqBody
	err := decoder.Decode(&body)
	if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	// get skill
	skill := ctrl.MainDB.Skills.GetSkill(body.Skill)
	if skill == nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	playerData, err := ctrl.MainDB.GetPlayerData(c.Request.Context(), publicKey)
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get player data", err)
		return
	}
	currentLevel := playerData.GetSkillLevel(body.Skill)
	if currentLevel >= MAX_LEVEL {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	cost := skill.Levels[currentLevel].Cost
	newValue := skill.Levels[currentLevel].Value
	healthValue := 0
	if body.Skill == "health" {
		healthValue = newValue
	}
	applied, err := ctrl.MainDB.AtomicUpgrade(
		c.Request.Context(), publicKey, body.Skill+"Level",
		currentLevel, cost, healthValue,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"atomic upgrade", err, "skill", body.Skill)
		return
	}
	if !applied {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	playerData.Coins -= cost
	playerData.SetSkillLevel(body.Skill, currentLevel+1, newValue)
	if skill.IsInGameDB {
		fields := map[string]any{body.Skill: newValue}
		if body.Skill == "health" {
			fields = map[string]any{"maxHP": newValue, "hp": newValue}
		}
		err = withGameDBRetry(func() error {
			return ctrl.GameDB.UpdatePlayerData(
				c.Request.Context(), publicKey, fields,
			)
		})
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"game db update player skill", err,
				"skill", body.Skill,
			)
			return
		}
	}
	go ctrl.sendUpgradeAchievement(
		publicKey, uint8(skill.ID), uint8(currentLevel+1),
	)
	// return updated player data
	c.JSON(http.StatusOK, gin.H{
		"playerData": playerData,
	})
}

func (ctrl *Controller) sendUpgradeAchievement(
	publicKey string, skillID uint8, level uint8,
) {
	payload := bytes.Buffer{}
	payload.WriteByte(byte(constants.DBManagerUpgradeType))
	payload.WriteString(publicKey)
	payload.WriteByte(byte(skillID))
	payload.WriteByte(byte(level))
	ctrl.AchievementsChan <- payload.Bytes()
}
