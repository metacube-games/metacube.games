package api

import (
	"backend/api/controller"
	"backend/api/router"
	"backend/blockchain"
	"os"
)

func InitAndStartAPI(
	envFile map[string]string,
	inter bool,
) (chan blockchain.NFT_tx, chan []byte) {
	ctrl := controller.NewController(envFile, inter)
	r := router.NewRouter(envFile, inter, ctrl)
	if os.Getenv("SSL") == "true" {
		go r.RunTLS(
			":"+envFile["BACKEND_API_PORT"],
			envFile["SSL_CRT_FILE"],
			envFile["SSL_KEY_FILE"],
		)
	} else {
		go r.Run(":" + envFile["BACKEND_API_PORT"])
	}
	return ctrl.StarknetController.TxChan, ctrl.AchievementsChan
}
