package middlewares

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	PublicKey string `json:"publicKey"`
	jwt.RegisteredClaims
}

// VerifyJWT is a middleware that verifies the JWT token
func VerifyJWT(envFile map[string]string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// get authorization header
		authorization := c.GetHeader("Authorization")
		// check header value
		if !strings.HasPrefix(authorization, "Bearer ") {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		// get token
		tokenString := strings.TrimPrefix(authorization, "Bearer ")
		// verify token
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(
			tokenString,
			claims,
			func(token *jwt.Token) (any, error) {
				// Pin the signing algorithm to HS256 to defend against
				// `alg` confusion attacks (e.g. token claims `none`, or
				// a forged RS256 token where the public key is accepted
				// as the HS256 secret).
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf(
						"unexpected signing method: %v", token.Header["alg"],
					)
				}
				return []byte(envFile["BACKEND_API_JWT_KEY"]), nil
			},
		)
		if err != nil || !token.Valid {
			c.AbortWithStatus(http.StatusUnauthorized)
			return
		}
		// store public key in context
		c.Set("publicKey", claims.PublicKey)
		// continue
		c.Next()
	}
}
