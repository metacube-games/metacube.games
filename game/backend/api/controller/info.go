package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetNFTCount returns the number of NFTs discovered so far
func (ctrl *Controller) GetNFTCount(c *gin.Context) {
	count, err := ctrl.MainDB.GetNFTCount(c.Request.Context())
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get nft count", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"found": count,
	})
}

// GetAllStatistics returns the statistics of all players
func (ctrl *Controller) GetAllStatistics(c *gin.Context) {
	stats, err := ctrl.MainDB.GetAllStatistics(c.Request.Context())
	if err != nil {
		abortErr(c, http.StatusInternalServerError, "get all statistics", err)
		return
	}
	c.JSON(http.StatusOK, stats)
}
