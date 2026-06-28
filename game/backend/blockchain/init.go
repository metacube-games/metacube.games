package blockchain

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/NethermindEth/starknet.go/account"
	"github.com/NethermindEth/starknet.go/rpc"
	"github.com/NethermindEth/starknet.go/utils"
	"github.com/metacube-games/starknetid.go/constants"
	"github.com/metacube-games/starknetid.go/provider"
)

const zeroPrivKeyHex = "0x" +
	"0000000000000000000000000000000000000000000000000000000000000000"

var (
	colors = []string{
		"\033[31m",
		"\033[32m",
		"\033[33m",
		"\033[34m",
		"\033[35m",
		"\033[36m",
	} // ANSI color codes
	reset = "\033[0m"
)

type NFT_tx struct {
	To      string
	TokenID uint64
}

type StarknetController struct {
	Client           *rpc.Provider
	StarknetIDClient *provider.Provider
	Batcher          *Batcher
	TxChan           chan NFT_tx
	Claim            *Claim
	ClaimChan        chan string
	SkinsHandler     *SkinsHandler
}

// NewStarknetController creates a new Starknet controller
func NewStarknetController(
	envFile map[string]string,
) (*StarknetController, error) {
	// create a new connection to the Starknet RPC
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := rpc.NewProvider(
		ctx,
		envFile["BACKEND_API_STARKNET_RPC_URL"],
	)
	if err != nil && !errors.Is(err, rpc.ErrIncompatibleVersion) {
		return nil, err
	}
	if errors.Is(err, rpc.ErrIncompatibleVersion) {
		fmt.Println(
			"Warning: RPC node uses a newer JSON-RPC spec version than " +
				"starknet.go expects — proceeding anyway",
		)
	}
	starknetIDClient, err := provider.NewProvider(
		client,
		constants.SN_MAIN,
		nil,
	)
	if err != nil {
		return nil, err
	}

	accountAddressInFelt, err := utils.HexToFelt(
		envFile["BACKEND_API_STARKNET_ACCOUNT_ADDRESS"],
	)
	if err != nil {
		return nil, err
	}

	ks := account.NewMemKeystore()
	resp, err := http.Get(
		envFile["BACKEND_API_STARKNET_ACCOUNT_PRIVATE_KEY_URL"],
	)
	var privKeyBI *big.Int
	if err != nil || resp.StatusCode != http.StatusOK {
		fmt.Println(
			"Failed to get private key from the server, setting it to 0",
		)
		privKeyBI, _ = new(big.Int).SetString(
			zeroPrivKeyHex, 0,
		)
	} else {
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Println(
				"Failed to read private key from the server, setting it to 0",
			)
			privKeyBI, _ = new(big.Int).SetString(
				zeroPrivKeyHex, 0,
			)
		} else {
			var ok bool
			bodyStr := string(body)
			bodyStr = strings.ReplaceAll(bodyStr, " ", "")
			bodyStr = strings.ReplaceAll(bodyStr, "\n", "")
			privKeyBI, ok = new(big.Int).SetString(bodyStr, 0)
			if !ok {
				fmt.Println(
					"Failed to parse private key from the server, " +
						"setting it to 0",
				)
				privKeyBI, _ = new(big.Int).SetString(
					zeroPrivKeyHex, 0,
				)
			}
		}
	}
	ks.Put("", privKeyBI)

	accountCairoVersion, err := strconv.Atoi(
		envFile["BACKEND_API_STARKNET_ACCOUNT_CAIRO_VERSION"],
	)
	if err != nil {
		return nil, err
	}

	accnt, err := account.NewAccount(
		client,
		accountAddressInFelt,
		"",
		ks,
		account.CairoVersion(accountCairoVersion),
	)
	if err != nil {
		return nil, err
	}

	contractAddressInFelt, err := utils.HexToFelt(
		envFile["BACKEND_API_STARKNET_V1_CONTRACT_ADDRESS"],
	)
	if err != nil {
		return nil, err
	}

	maxSize, err := strconv.Atoi(envFile["BACKEND_API_STARKNET_MAX_SIZE"])
	if err != nil {
		return nil, err
	}

	maxFee, err := strconv.ParseUint(
		envFile["BACKEND_API_STARKNET_MAX_FEE"], 10, 64,
	)
	if err != nil {
		return nil, err
	}
	maxFee = maxFee * 3

	waitingTimeInt, err := strconv.Atoi(
		envFile["BACKEND_API_STARKNET_WAITING_TIME_SECONDS"],
	)
	if err != nil {
		return nil, err
	}

	waitingTime := time.Duration(waitingTimeInt) * time.Second

	inChan := make(chan NFT_tx, 10000)
	failChan := make(chan NFT_tx, 10000)

	batcher := NewBatcher(
		accnt,
		contractAddressInFelt,
		maxSize,
		maxFee,
		waitingTime,
		inChan,
		failChan,
	)

	claimAccountAddressInFelt, err := utils.HexToFelt(
		envFile["BACKEND_API_STARKNET_CLAIM_ACCOUNT_ADDRESS"],
	)
	if err != nil {
		return nil, err
	}

	ks = account.NewMemKeystore()
	resp, err = http.Get(
		envFile["BACKEND_API_STARKNET_CLAIM_ACCOUNT_PRIVATE_KEY_URL"],
	)
	if err != nil || resp.StatusCode != http.StatusOK {
		fmt.Println(
			"Failed to get private key from the server, setting it to 0",
		)
		privKeyBI, _ = new(big.Int).SetString(
			zeroPrivKeyHex, 0,
		)
	} else {
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Println(
				"Failed to read private key from the server, setting it to 0",
			)
			privKeyBI, _ = new(big.Int).SetString(
				zeroPrivKeyHex, 0,
			)
		} else {
			var ok bool
			bodyStr := string(body)
			bodyStr = strings.ReplaceAll(bodyStr, " ", "")
			bodyStr = strings.ReplaceAll(bodyStr, "\n", "")
			privKeyBI, ok = new(big.Int).SetString(bodyStr, 0)
			if !ok {
				fmt.Println(
					"Failed to parse private key from the server, " +
						"setting it to 0",
				)
				privKeyBI, _ = new(big.Int).SetString(
					zeroPrivKeyHex, 0,
				)
			}
		}
	}
	ks.Put("", privKeyBI)

	claimAccnt, err := account.NewAccount(
		client,
		claimAccountAddressInFelt,
		"",
		ks,
		account.CairoVersion(accountCairoVersion),
	)
	if err != nil {
		return nil, err
	}

	claimInChan := make(chan string, 10000)

	claim := NewClaim(
		claimAccnt,
		maxFee,
		claimInChan,
	)

	batcher.Run()
	claim.Run()

	go HandleFailures(envFile, failChan)

	skinsHandler, err := NewSkinsHandler(
		envFile["BACKEND_API_STARKNET_PASSCARD_SKIN_CONTRACT_ADDRESS"],
		envFile["BACKEND_API_STARKNET_GENESIS_SKIN_CONTRACT_ADDRESS"],
		envFile["BACKEND_API_STARKNET_BROTHER_SKIN_CONTRACT_ADDRESS"],
	)
	if err != nil {
		return nil, err
	}

	return &StarknetController{
		Client:           client,
		StarknetIDClient: starknetIDClient,
		Batcher:          batcher,
		TxChan:           inChan,
		Claim:            claim,
		ClaimChan:        claimInChan,
		SkinsHandler:     skinsHandler,
	}, nil
}
