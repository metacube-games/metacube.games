package router

import (
	"backend/api/controller"
	"backend/api/middlewares"

	"github.com/gin-gonic/gin"
)

// NewRouter creates a new gin router with all the routes and middlewares
func NewRouter(
	envFile map[string]string,
	inter bool,
	ctrl *controller.Controller,
) *gin.Engine {
	router := gin.Default()

	router.Use(middlewares.CORS(envFile))

	apiV1 := router.Group("/api/v1")
	{
		auth := apiV1.Group("/auth")
		{
			auth.GET("/claim", ctrl.Claim)
			auth.GET("/nonce", ctrl.GetNonce)
			auth.GET("/guest", ctrl.GetGuestID)
			auth.POST("/connect", ctrl.Connect)
			auth.GET("/refresh", ctrl.Refresh)
			auth.GET("/disconnect", ctrl.Disconnect)
		}

		info := apiV1.Group("/info")
		{
			info.GET("/nft", ctrl.GetNFTCount)
			info.GET("/stats", ctrl.GetAllStatistics)
		}

		apiV1.Use(middlewares.VerifyJWT(envFile))

		if !inter {
			game := apiV1.Group("/game")
			{
				game.GET("/place", ctrl.GetPlace)
				game.DELETE("/queue", ctrl.DeleteQueue)
			}
		}

		profile := apiV1.Group("/profile")
		{
			profile.GET("/data", ctrl.GetPlayerData)
			profile.GET("/coins", ctrl.GetPlayerCoins)
			profile.GET("/stats", ctrl.GetStatistics)
			profile.GET("/nft", ctrl.GetNFTsForPlayer)
			profile.GET("/skins", ctrl.GetSkinsForPlayer)
			profile.POST("/skin", ctrl.SetSkinForPlayer)
			profile.GET("/address", ctrl.GetRewardAddress)
			profile.POST("/address", ctrl.SetRewardAddress)
			profile.GET("/referral/code", ctrl.GetReferralCode)
			profile.GET("/referral/invites", ctrl.GetReferralInvites)
			if !inter {
				profile.POST("/username", ctrl.SetUsername)
				profile.GET("/starknetid", ctrl.GetStarknetID)
				profile.POST("/starknetid", ctrl.SetStarknetID)
			}
		}

		if !inter {
			upgrade := apiV1.Group("/upgrade")
			{
				upgrade.POST("/", ctrl.Upgrade)
			}
		}

		if !inter {
			achievements := apiV1.Group("/achievements")
			{
				achievements.POST("/link", ctrl.SetLinkAchievement)
				achievements.POST("/layer", ctrl.SetLayerAchievement)
				achievements.POST("/ally", ctrl.SetAllyAchievement)
			}
		}

		if !inter {
			admin := apiV1.Group("/admin")
			{
				admin.POST("/transition", ctrl.SetTransition)
			}
		}
	}

	return router
}
