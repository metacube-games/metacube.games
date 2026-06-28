package cache

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

var rotateRefreshTokenScript = redis.NewScript(`
local current = redis.call('HGET', KEYS[1], 'refreshToken')
if current == ARGV[1] then
    redis.call('HSET', KEYS[1], 'refreshToken', ARGV[2])
    return 1
end
return 0
`)

// SaveKeyWithNonce saves a public key with its associated nonce
func (cache *Cache) SaveNonce(
	ctx context.Context,
	publicKey string,
	nonce string,
) error {
	return cache.Client.HSet(ctx, publicKey, "nonce", nonce).Err()
}

// GetNonce returns the nonce associated with the given public key and deletes
// it from the cache
func (cache *Cache) GetNonce(
	ctx context.Context,
	publicKey string,
) (string, error) {
	// get the nonce
	nonce, err := cache.Client.HGet(ctx, publicKey, "nonce").Result()
	if err != nil {
		return "", err
	}
	// delete the entry
	err = cache.Client.Del(ctx, publicKey).Err()
	return nonce, err
}

// SaveRefreshToken saves a refresh token for a given public key
func (cache *Cache) SaveRefreshToken(
	ctx context.Context,
	publicKey string,
	refreshToken string,
) error {
	return cache.Client.HSet(ctx, publicKey, "refreshToken", refreshToken).Err()
}

// GetRefreshToken returns the refresh token associated with the given public
// key
func (cache *Cache) GetRefreshToken(
	ctx context.Context,
	publicKey string,
) (string, error) {
	return cache.Client.HGet(ctx, publicKey, "refreshToken").Result()
}

// RotateRefreshToken atomically replaces the saved refresh token only if
// it currently matches expected. Returns false when a concurrent refresh
// has already rotated underneath us.
func (cache *Cache) RotateRefreshToken(
	ctx context.Context,
	publicKey string,
	expected string,
	next string,
) (bool, error) {
	res, err := rotateRefreshTokenScript.Run(
		ctx, cache.Client,
		[]string{publicKey},
		expected, next,
	).Int64()
	if err != nil {
		return false, err
	}
	return res == 1, nil
}

// DeleteRefreshToken deletes the refresh token associated with the given public
// key
func (cache *Cache) DeleteRefreshToken(
	ctx context.Context,
	publicKey string,
) error {
	return cache.Client.Del(ctx, publicKey).Err()
}

// AddTempPlayerToServer adds a temporary player to a server
func (cache *Cache) AddTempPlayerToServer(
	ctx context.Context,
	serverID int,
	publicKey string,
) error {
	return cache.Client.Set(
		ctx,
		"servers:tmp:"+strconv.Itoa(serverID)+":"+publicKey,
		"1",
		time.Second*2,
	).Err()
}

// GetServersTempPlayersCounts returns the number of temporary players on each
// server
func (cache *Cache) GetServersTempPlayersCounts(
	ctx context.Context,
) (map[int]int, error) {
	// get all counts
	serversPlayersCounts, err := cache.Client.Keys(
		ctx,
		"servers:tmp:*",
	).Result()
	if err != nil {
		return nil, err
	}
	// Keys are "servers:tmp:<serverID>:<publicKey>"
	playersCountsPerServer := make(map[int]int)
	for _, key := range serversPlayersCounts {
		parts := strings.SplitN(key, ":", 4)
		if len(parts) < 3 {
			continue
		}
		serverID, err := strconv.Atoi(parts[2])
		if err != nil {
			continue
		}
		playersCountsPerServer[serverID]++
	}
	return playersCountsPerServer, nil
}

// SaveChatToken saves a chat token for a given public key
func (cache *Cache) SaveChatToken(
	ctx context.Context,
	publicKey string,
	chatToken string,
) error {
	return cache.Client.HSet(ctx, publicKey, "chatToken", chatToken).Err()
}

// SaveStarknetID saves a starknet ID for a given public key
func (cache *Cache) SaveStarknetID(
	ctx context.Context,
	publicKey string,
	starknetID string,
) error {
	return cache.Client.HSet(ctx, publicKey, "starknetID", starknetID).Err()
}

// GetStarknetID returns the starknet ID associated with the given public key
func (cache *Cache) GetStarknetID(
	ctx context.Context,
	publicKey string,
) (string, error) {
	return cache.Client.HGet(ctx, publicKey, "starknetID").Result()
}

// GetChatToken returns the chat token associated with the given public key
func (c *Cache) GetChatToken(
	ctx context.Context,
	publicKey string,
) (string, error) {
	return c.Client.HGet(ctx, publicKey, "chatToken").Result()
}

// DeleteChatToken deletes the chat token associated with the given public key
func (c *Cache) DeleteChatToken(
	ctx context.Context,
	publicKey string,
) error {
	return c.Client.HDel(ctx, publicKey, "chatToken").Err()
}

// RecordClaimAddress records that the given address has claimed the STRK tokens
func (c *Cache) RecordClaimAddress(
	ctx context.Context,
	address string,
) error {
	return c.Client.Set(
		ctx,
		"claimed:"+address,
		"1",
		0,
	).Err()
}

// ClaimAddressOnce atomically records the claim and returns true if the
// caller acquired it (the key did not exist before), false if another
// concurrent request already claimed. Prevents the TOCTOU window between
// CheckClaimAddress + ClaimChan send + RecordClaimAddress.
func (c *Cache) ClaimAddressOnce(
	ctx context.Context,
	address string,
) (bool, error) {
	return c.Client.SetNX(ctx, "claimed:"+address, "1", 0).Result()
}

// DeleteClaimAddress removes the claim reservation; used to roll back when
// the downstream send (e.g. queueing into the Starknet ClaimChan) fails.
func (c *Cache) DeleteClaimAddress(
	ctx context.Context,
	address string,
) error {
	return c.Client.Del(ctx, "claimed:"+address).Err()
}

// CheckClaimAddress checks if the given address has claimed the STRK tokens
func (c *Cache) CheckClaimAddress(
	ctx context.Context,
	address string,
) (bool, error) {
	claimed, err := c.Client.Get(ctx, "claimed:"+address).Result()
	if err != nil && err.Error() != "redis: nil" {
		return false, err
	}
	if claimed == "" {
		return false, nil
	}
	return true, nil
}

// RegisterIPAddress registers the given IP address
func (c *Cache) RegisterIPAddress(
	ctx context.Context,
	ipAddress string,
) (int64, error) {
	return c.Client.Incr(ctx, "ip:"+ipAddress).Result()
}

// SaveGuestID saves the guest ID for the given IP address
func (c *Cache) SaveGuestID(
	ctx context.Context,
	guestID string,
) error {
	return c.Client.Set(
		ctx,
		guestID,
		"1",
		0,
	).Err()
}

// ExistGuestID checks if the guest ID exists
func (c *Cache) ExistGuestID(
	ctx context.Context,
	guestID string,
) (bool, error) {
	exists, err := c.Client.Exists(ctx, guestID).Result()
	if err != nil {
		return false, err
	}
	if exists == 0 {
		return false, nil
	}
	return true, nil
}
