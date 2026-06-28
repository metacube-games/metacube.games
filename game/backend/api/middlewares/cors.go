package middlewares

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// CORS middleware to handle CORS requests
func CORS(envFile map[string]string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if os.Getenv("SSL") == "true" {
			c.Header("Access-Control-Allow-Origin", envFile["GAME_CORS_ORIGIN"])
		}
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}

		// continue
		c.Next()
	}
}
