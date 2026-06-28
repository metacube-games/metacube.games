package controller

import (
	"net/http"
	"strings"

	"backend/internal/constants"

	"github.com/gin-gonic/gin"
)

// SetTransition changes the layer of the game to the next one
func (ctrl *Controller) SetTransition(c *gin.Context) {
	publicKey := c.GetString("publicKey")
	admins := strings.Split(ctrl.EnvFile["BACKEND_ADMIN_LIST"], ",")
	allowed := false
	for _, a := range admins {
		if strings.TrimSpace(a) == publicKey {
			allowed = true
			break
		}
	}
	if !allowed {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}
	currentLayer, err := ctrl.GameDB.GetCurrentLayer(c.Request.Context())
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get current layer", err)
		return
	}
	nextLayer := currentLayer - 1
	if nextLayer < 0 {
		nextLayer = 10
	}
	shouldPublish, err := ctrl.GameDB.UpdateLayerInfo(
		c.Request.Context(), nextLayer,
	)
	if err != nil {
		abortErr(c, http.StatusInternalServerError,
			"update layer info", err,
			"nextLayer", nextLayer,
		)
		return
	}
	ctx := c.Request.Context()
	total := constants.Layer0NbVoxels
	switch nextLayer {
	case 4:
		dead := constants.Layer5NbVoxels
		ctrl.GameDB.SetNbVoxelsDead(ctx, dead)
		ctrl.GameDB.SetNbVoxelsAlive(ctx, total-dead)
	case 3:
		dead := constants.Layer4NbVoxels
		ctrl.GameDB.SetNbVoxelsDead(ctx, dead)
		ctrl.GameDB.SetNbVoxelsAlive(ctx, total-dead)
	case 2:
		dead := constants.Layer3NbVoxels
		ctrl.GameDB.SetNbVoxelsDead(ctx, dead)
		ctrl.GameDB.SetNbVoxelsAlive(ctx, total-dead)
	case 1:
		dead := constants.Layer2NbVoxels
		ctrl.GameDB.SetNbVoxelsDead(ctx, dead)
		ctrl.GameDB.SetNbVoxelsAlive(ctx, total-dead)
	case 0:
		dead := constants.Layer1NbVoxels
		ctrl.GameDB.SetNbVoxelsDead(ctx, dead)
		ctrl.GameDB.SetNbVoxelsAlive(ctx, total-dead)
	case 10:
		ctrl.GameDB.SetNbVoxelsDead(ctx, total)
		ctrl.GameDB.SetNbVoxelsAlive(ctx, 0)
	}
	if shouldPublish {
		err = ctrl.GameDB.PublishNewLayer(c.Request.Context(), nextLayer)
		if err != nil {
			abortErr(c, http.StatusInternalServerError,
				"publish new layer", err,
				"nextLayer", nextLayer,
			)
			return
		}
	}
}
