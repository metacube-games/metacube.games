package controller

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"

	"backend/internal/constants"

	"github.com/gin-gonic/gin"
)

func (ctrl *Controller) SetLinkAchievement(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	achieved, err := ctrl.MainDB.HasLinkAchievement(
		c.Request.Context(), publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"check link achievement", err)
		return
	}
	if !achieved {
		payload := bytes.Buffer{}
		payload.WriteByte(byte(constants.DBManagerLinkType))
		payload.WriteString(publicKey)
		ctrl.AchievementsChan <- payload.Bytes()
	}
}

type SetLayerAchievementReqBody struct {
	Layer int `json:"layer"`
}

func (ctrl *Controller) SetLayerAchievement(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	// decode request body
	decoder := json.NewDecoder(c.Request.Body)
	var body SetLayerAchievementReqBody
	err := decoder.Decode(&body)
	if err != nil {
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	layer, timestamp, err := ctrl.GameDB.GetLayerInfo(c.Request.Context())
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get layer info", err)
		return
	}
	if layer != body.Layer {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	// now should be within 60 seconds after the new layer was published
	if time.Now().Unix()-timestamp > 60 {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	payload := bytes.Buffer{}
	payload.WriteByte(byte(constants.DBManagerLayerType))
	payload.WriteString(publicKey)
	payload.WriteByte(byte(uint8(body.Layer)))
	ctrl.AchievementsChan <- payload.Bytes()
}

func (ctrl *Controller) SetAllyAchievement(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	achievements, err := ctrl.MainDB.HasAllyAchievement(
		c.Request.Context(), publicKey,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"check ally achievement", err)
		return
	}
	if !achievements {
		payload := bytes.Buffer{}
		payload.WriteByte(byte(constants.DBManagerAllyType))
		payload.WriteString(publicKey)
		ctrl.AchievementsChan <- payload.Bytes()
	}
}
