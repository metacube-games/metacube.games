package chat

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"slices"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024
)

var upgrader websocket.Upgrader

func InitUpgrader(origin string) {
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			return r.Header.Get("Origin") == origin
		},
	}
}

type Client struct {
	hub       *Hub
	conn      *websocket.Conn
	send      chan Message
	publicKey string
	username  string
	isAdmin   bool
}

func (c *Client) HandleDisconnect() {
	c.hub.unregister <- c
	c.conn.Close()
}

func adminReply(c *Client, text string) {
	safeSend(c, Message{
		Type:     MESSAGE_TYPE,
		Language: "admin",
		Messages: []MessageType{
			{
				Content:   text,
				Timestamp: time.Now().Unix(),
				From:      "Admin",
				IsAdmin:   true,
			},
		},
	})
}

func ambiguousReply(cmd, username string, keys []string) string {
	return fmt.Sprintf(
		"%s: %d users named %q; retry /%s <publicKey>: %s",
		cmd, len(keys), username, cmd, strings.Join(keys, ", "),
	)
}

func isPublicKey(s string) bool {
	if len(s) != 64 {
		return false
	}
	for i := 0; i < len(s); i++ {
		c := s[i]
		if !((c >= '0' && c <= '9') ||
			(c >= 'a' && c <= 'f') ||
			(c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}

func (c *Client) readPump() {
	defer c.HandleDisconnect()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(
				err,
				websocket.CloseGoingAway,
				websocket.CloseAbnormalClosure,
			) {
				slog.Error("read pump", "err", err)
			}
			break
		}
		message, ok, err := c.HandleData(data)
		if err != nil {
			slog.Error("handle data", "err", err)
			break
		}
		if !ok {
			continue
		}

		if strings.HasPrefix(message.Messages[0].Content, "/warn") {
			if !c.isAdmin {
				continue
			}
			warnedUsername := strings.TrimPrefix(
				message.Messages[0].Content, "/warn ",
			)
			c.hub.mu.RLock()
			targets := make([]*Client, 0)
			for client := range c.hub.clients {
				if client.username == warnedUsername {
					targets = append(targets, client)
				}
			}
			c.hub.mu.RUnlock()
			for _, target := range targets {
				safeSend(target, Message{
					Type:     MESSAGE_TYPE,
					Language: "admin",
					Messages: []MessageType{
						{
							Content:   "warned",
							Timestamp: time.Now().Unix(),
							From:      "Admin",
							IsBanned:  false,
							IsAdmin:   true,
						},
					},
				})
			}
			continue
		} else if strings.HasPrefix(message.Messages[0].Content, "/ban ") {
			if !c.isAdmin {
				continue
			}
			arg := strings.TrimPrefix(
				message.Messages[0].Content, "/ban ",
			)
			var bannedKey string
			if isPublicKey(arg) {
				bannedKey = strings.ToLower(arg)
			} else {
				ctx, cancel := context.WithTimeout(
					context.Background(), 5*time.Second)
				keys, err := c.hub.mainDB.GetPublicKeysByUsername(
					ctx, arg,
				)
				cancel()
				if err != nil {
					slog.Error("resolve username for ban", "err", err)
					adminReply(c, "ban: lookup failed")
					continue
				}
				if len(keys) == 0 {
					adminReply(c, "ban: no user named "+arg)
					continue
				}
				if len(keys) > 1 {
					adminReply(c, ambiguousReply("ban", arg, keys))
					continue
				}
				bannedKey = keys[0]
			}
			fmt.Printf("Banning %s\n", bannedKey)
			c.hub.mu.Lock()
			c.hub.banned = append(c.hub.banned, bannedKey)
			updates := make(map[string]Message, len(c.hub.histories))
			for lang := range c.hub.histories {
				temp := c.hub.histories[lang]
				for i, msg := range temp.Messages {
					if msg.PublicKey == bannedKey {
						temp.Messages[i].IsBanned = true
						temp.Messages[i].Content = "User banned"
					}
				}
				c.hub.histories[lang] = temp
				updates[lang] = temp
			}
			clients := make([]*Client, 0, len(c.hub.clients))
			var bannee *Client
			for client := range c.hub.clients {
				clients = append(clients, client)
				if client.publicKey == bannedKey {
					bannee = client
				}
			}
			_, err = c.hub.bannedFile.WriteString(bannedKey + "\n")
			c.hub.mu.Unlock()
			if err != nil {
				slog.Error("write banned file", "err", err)
			}
			for _, temp := range updates {
				for _, client := range clients {
					safeSend(client, temp)
				}
			}
			if bannee != nil {
				safeSend(bannee, Message{
					Type:     MESSAGE_TYPE,
					Language: "admin",
					Messages: []MessageType{
						{
							Content:   "banned",
							Timestamp: time.Now().Unix(),
							From:      "Admin",
							IsBanned:  false,
							IsAdmin:   true,
						},
					},
				})
			}
			continue
		} else if strings.HasPrefix(message.Messages[0].Content, "/unban ") {
			if !c.isAdmin {
				continue
			}
			arg := strings.TrimPrefix(
				message.Messages[0].Content, "/unban ",
			)
			var unbannedKey string
			if isPublicKey(arg) {
				unbannedKey = strings.ToLower(arg)
			} else {
				ctx, cancel := context.WithTimeout(
					context.Background(), 5*time.Second)
				keys, err := c.hub.mainDB.GetPublicKeysByUsername(
					ctx, arg,
				)
				cancel()
				if err != nil {
					slog.Error("resolve username for unban", "err", err)
					adminReply(c, "unban: lookup failed")
					continue
				}
				if len(keys) == 0 {
					adminReply(c, "unban: no user named "+arg)
					continue
				}
				if len(keys) > 1 {
					adminReply(c, ambiguousReply("unban", arg, keys))
					continue
				}
				unbannedKey = keys[0]
			}
			c.hub.mu.Lock()
			for i, banned := range c.hub.banned {
				if banned == unbannedKey {
					fmt.Printf("Unbanning %s\n", unbannedKey)
					c.hub.banned = append(
						c.hub.banned[:i], c.hub.banned[i+1:]...,
					)
					break
				}
			}
			c.hub.bannedFile.Truncate(0)
			c.hub.bannedFile.Seek(0, 0)
			for _, banned := range c.hub.banned {
				_, err := c.hub.bannedFile.WriteString(banned + "\n")
				if err != nil {
					slog.Error("write banned file", "err", err)
				}
			}
			c.hub.mu.Unlock()
			continue
		}

		if ok {
			c.hub.broadcast <- message
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer c.HandleDisconnect()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}

			marshalledMessages, err := json.Marshal(message)
			if err != nil {
				return
			}

			w.Write(marshalledMessages)

			if err := w.Close(); err != nil {
				return
			}

			// Close the connection if the user was banned
			if message.Language == "admin" &&
				message.Messages[0].Content == "banned" {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(
				websocket.PingMessage,
				nil,
			); err != nil {
				return
			}
		}
	}
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	publicKey := r.URL.Query().Get("publicKey")
	if publicKey == "" {
		http.Error(w, "No public key provided", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// The token has one-time use
	defer hub.cache.DeleteChatToken(ctx, publicKey)

	token := r.URL.Query().Get("token")

	chatToken, err := hub.cache.GetChatToken(ctx, publicKey)
	if err != nil {
		http.Error(w, "", http.StatusInternalServerError)
		return
	}

	if token != chatToken {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	username, err := hub.mainDB.GetUsername(ctx, publicKey)
	if err != nil {
		http.Error(w, "", http.StatusInternalServerError)
		return
	}

	hub.mu.RLock()
	isBanned := slices.Contains(hub.banned, publicKey)
	hub.mu.RUnlock()
	if isBanned {
		http.Error(w, "", http.StatusForbidden)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("upgrade ws", "err", err)
		return
	}

	isAdmin := slices.Contains(hub.admins, publicKey)

	client := &Client{
		hub:       hub,
		conn:      conn,
		send:      make(chan Message, 256),
		publicKey: publicKey,
		username:  username,
		isAdmin:   isAdmin,
	}
	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}
