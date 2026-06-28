package chat

import (
	"backend/cache"
	"backend/databases/data"
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync"
)

const HISTORY_SIZE = 100

type Hub struct {
	// mu guards clients, histories, banned, and bannedFile writes.
	mu           sync.RWMutex
	cache        *cache.Cache
	mainDB       *data.MainDB
	clients      map[*Client]bool
	broadcast    chan Message
	historyFiles map[string]*os.File
	histories    map[string]Message
	register     chan *Client
	unregister   chan *Client
	admins       []string
	bannedFile   *os.File
	banned       []string
}

func newHub(envFile map[string]string) *Hub {
	c, err := cache.NewCache(envFile)
	if err != nil {
		slog.Error("create cache", "err", err)
		os.Exit(1)
	}
	m, err := data.NewMainDB(envFile)
	if err != nil {
		slog.Error("create main db", "err", err)
		os.Exit(1)
	}
	// open or create a history file per language
	historyFiles := make(map[string]*os.File)
	for _, lang := range LANGUAGES {
		historyFile, err := os.OpenFile(
			envFile["BACKEND_CHAT_HISTORY_DIR_PATH"]+"history_"+lang+".txt",
			os.O_RDWR|os.O_CREATE,
			0666,
		)
		if err != nil {
			slog.Error("open history file",
				"lang", lang, "err", err)
			for _, file := range historyFiles {
				file.Close()
			}
			os.Exit(1)
		}
		historyFiles[lang] = historyFile
	}

	// create a history file per language
	history := make(map[string]Message)
	for lang, historyFile := range historyFiles {
		messagesArray := make([]MessageType, 0, HISTORY_SIZE)
		history[lang] = Message{
			Type:     HISTORY_TYPE,
			Messages: messagesArray,
			Language: lang,
		}
		// read history file
		reader := bufio.NewReader(historyFile)
		for range HISTORY_SIZE {
			line, err := reader.ReadString('\n')
			if err == io.EOF {
				break
			} else if err != nil {
				slog.Error("read history file", "err", err)
				os.Exit(1)
			}
			var msg MessageType
			if err := json.Unmarshal([]byte(line), &msg); err != nil {
				slog.Error("unmarshal history file", "err", err)
				os.Exit(1)
			}
			temp := history[lang]
			temp.Messages = append(temp.Messages, msg)
			history[lang] = temp
		}
		if _, err := historyFile.Seek(0, io.SeekEnd); err != nil {
			slog.Error("seek history file", "err", err)
			os.Exit(1)
		}
	}

	admins := strings.Split(envFile["BACKEND_CHAT_ADMIN_LIST"], ",")

	// open or create a banned file
	bannedFile, err := os.OpenFile(
		envFile["BACKEND_CHAT_HISTORY_DIR_PATH"]+"banned.txt",
		os.O_RDWR|os.O_CREATE,
		0666,
	)
	if err != nil {
		slog.Error("open banned file", "err", err)
		os.Exit(1)
	}
	// read banned file
	banned := make([]string, 0)
	reader := bufio.NewReader(bannedFile)
	for {
		line, err := reader.ReadString('\n')
		if err == io.EOF {
			break
		} else if err != nil {
			slog.Error("read banned file", "err", err)
			os.Exit(1)
		}
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		banned = append(banned, line)
		for lang := range history {
			temp := history[lang]
			for i, msg := range temp.Messages {
				if msg.PublicKey == line {
					temp.Messages[i].IsBanned = true
					temp.Messages[i].Content = "User banned"
				}
			}
			history[lang] = temp
		}
	}
	// seek to the end of the file
	if _, err := bannedFile.Seek(0, io.SeekEnd); err != nil {
		slog.Error("seek banned file", "err", err)
		os.Exit(1)
	}

	return &Hub{
		cache:        c,
		mainDB:       m,
		clients:      make(map[*Client]bool),
		broadcast:    make(chan Message),
		historyFiles: historyFiles,
		histories:    history,
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		admins:       admins,
		bannedFile:   bannedFile,
		banned:       banned,
	}
}

// safeSend writes msg to the client's send channel, recovering from the
// `send on closed channel` panic that occurs when hub.run has already
// disconnected the client. Returns true if the send succeeded.
//
// Callers in client.go/message.go snapshot the client list under h.mu,
// release the lock, then send; in that window hub.run can close the
// channel. This helper makes that window survivable without holding the
// lock during channel sends (which would risk deadlocking the hub).
func safeSend(c *Client, msg Message) (ok bool) {
	defer func() {
		if r := recover(); r != nil {
			ok = false
		}
	}()
	c.send <- msg
	return true
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			histories := make([]Message, 0, len(h.histories))
			for _, history := range h.histories {
				histories = append(histories, history)
			}
			h.mu.Unlock()
			for _, history := range histories {
				client.send <- history
			}
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			lang := message.Language
			h.mu.Lock()
			if len(h.histories[lang].Messages) >= HISTORY_SIZE {
				temp := h.histories[lang]
				temp.Messages = temp.Messages[1:]
				h.histories[lang] = temp
			}
			temp := h.histories[lang]
			temp.Messages = append(temp.Messages, message.Messages[0])
			h.histories[lang] = temp
			clients := make([]*Client, 0, len(h.clients))
			for client := range h.clients {
				clients = append(clients, client)
			}
			historyFile := h.historyFiles[lang]
			h.mu.Unlock()
			fmt.Fprintf(historyFile, "%s\n", message.Messages[0].ToJson())
			var dropped []*Client
			for _, client := range clients {
				select {
				case client.send <- message:
				default:
					dropped = append(dropped, client)
				}
			}
			if len(dropped) > 0 {
				h.mu.Lock()
				for _, client := range dropped {
					if _, ok := h.clients[client]; ok {
						close(client.send)
						delete(h.clients, client)
					}
				}
				h.mu.Unlock()
			}
		}
	}
}
