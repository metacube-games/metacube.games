package chat

import (
	"context"
	"encoding/json"
	"slices"
	"time"
)

const (
	MESSAGE_TYPE = "message"
	HISTORY_TYPE = "history"
)

var LANGUAGES = []string{"english", "spanish", "french"}

type Message struct {
	Type     string        `json:"type"`
	Language string        `json:"lang,omitempty"`
	Messages []MessageType `json:"messages"`
}

type MessageReceived struct {
	Content  string `json:"msg"`
	Language string `json:"lang"`
}

type MessageType struct {
	// received
	Content string `json:"msg"`
	// added by server
	Timestamp int64  `json:"ts"`
	From      string `json:"from"`
	PublicKey string `json:"pk,omitempty"`
	IsBanned  bool   `json:"banned"`
	IsAdmin   bool   `json:"admin"`
}

func (c *Client) HandleSettings(msg *MessageReceived) {
	if msg.Content == "/username" {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		username, err := c.hub.mainDB.GetUsername(
			ctx, c.publicKey,
		)
		if err != nil {
			return
		}
		c.hub.mu.Lock()
		updates := make(map[string]Message, len(c.hub.histories))
		for lang := range c.hub.histories {
			temp := c.hub.histories[lang]
			for i, msg := range temp.Messages {
				if msg.PublicKey == c.publicKey {
					temp.Messages[i].From = username
				}
			}
			c.hub.histories[lang] = temp
			updates[lang] = temp
		}
		clients := make([]*Client, 0, len(c.hub.clients))
		for client := range c.hub.clients {
			clients = append(clients, client)
		}
		c.hub.mu.Unlock()
		// Send the updated history to all clients
		for _, temp := range updates {
			for _, client := range clients {
				safeSend(client, temp)
			}
		}
		c.username = username
	}
}

func (c *Client) HandleData(data []byte) (Message, bool, error) {
	var msg MessageReceived
	if err := json.Unmarshal(data, &msg); err != nil {
		return Message{}, false, err
	}
	if msg.Content == "" || msg.Language == "" {
		return Message{}, false, nil
	}
	if msg.Language == "settings" {
		c.HandleSettings(&msg)
		return Message{}, false, nil
	}
	if !slices.Contains(LANGUAGES, msg.Language) {
		return Message{}, false, nil
	}

	return Message{
		Type:     MESSAGE_TYPE,
		Language: msg.Language,
		Messages: []MessageType{
			{
				Content:   msg.Content,
				Timestamp: time.Now().Unix(),
				From:      c.username,
				PublicKey: c.publicKey,
				IsBanned:  false,
				IsAdmin:   c.isAdmin,
			},
		},
	}, true, nil
}

func (m *MessageType) ToJson() []byte {
	jsonMsg, _ := json.Marshal(m)
	return jsonMsg
}
