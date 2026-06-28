package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type Skills struct {
	Damage      Skill `json:"damage"`
	Multiplier  Skill `json:"multiplier"`
	Health      Skill `json:"health"`
	AttackRange Skill `json:"attackRange"`
	Fly         Skill `json:"fly"`
	CriticalHit Skill `json:"criticalHit"`
}

type Skill struct {
	ID         int     `json:"id"`
	Levels     []Level `json:"levels"`
	IsInGameDB bool    `json:"isInGameDB"`
}

type Level struct {
	Value int `json:"value"`
	Cost  int `json:"cost"`
}

type MainDB struct {
	Client *sql.DB
	Skills Skills
}

// NewMainDB returns a new main database
func NewMainDB(envFile map[string]string) (*MainDB, error) {
	// open a new connection to mysql
	client, err := sql.Open(
		"mysql",
		fmt.Sprintf(
			"%s:%s@%s(%s)/%s",
			envFile["USERS_DB_USER"],
			envFile["USERS_DB_PASSWORD"],
			envFile["USERS_DB_NETWORK"],
			envFile["USERS_DB_HOST"],
			envFile["USERS_DB_DB_NAME"],
		),
	)
	if err != nil {
		return nil, err
	}

	client.SetMaxOpenConns(25)
	client.SetMaxIdleConns(25)
	client.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err = client.PingContext(ctx)
	if err != nil {
		return nil, err
	}
	// open skills file
	fileContent, err := os.ReadFile(envFile["BACKEND_API_UPGRADES_FILE_PATH"])
	if err != nil {
		return nil, fmt.Errorf("read upgrades file: %w", err)
	}
	var skills Skills
	if err := json.Unmarshal(fileContent, &skills); err != nil {
		return nil, fmt.Errorf("parse upgrades file: %w", err)
	}
	return &MainDB{
		Client: client,
		Skills: skills,
	}, nil
}
