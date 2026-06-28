package controller

import (
	"log/slog"

	"github.com/gin-gonic/gin"
)

// abortErr logs the failure (with request method + path attached) and aborts
// the response with the given status.
func abortErr(c *gin.Context, status int, msg string, err error, args ...any) {
	args = append(args,
		"err", err,
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
	)
	slog.Error(msg, args...)
	c.AbortWithStatus(status)
}
