package chat

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"
)

func InitAndStartChatServer(envFile map[string]string) {
	InitUpgrader(envFile["GAME_CORS_ORIGIN"])
	hub := newHub(envFile)
	go hub.run()
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})
	server := &http.Server{
		Addr:              fmt.Sprintf(":%s", envFile["BACKEND_CHAT_PORT"]),
		ReadHeaderTimeout: 3 * time.Second,
	}
	if os.Getenv("SSL") == "true" {
		go func() {
			err := server.ListenAndServeTLS(
				envFile["SSL_CRT_FILE"],
				envFile["SSL_KEY_FILE"],
			)
			if err != nil {
				slog.Error("listen and serve tls", "err", err)
				os.Exit(1)
			}
		}()
	} else {
		go func() {
			err := server.ListenAndServe()
			if err != nil {
				slog.Error("listen and serve", "err", err)
				os.Exit(1)
			}
		}()
	}
}
