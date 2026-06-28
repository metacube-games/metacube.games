package blockchain

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"

	"github.com/NethermindEth/juno/core/felt"
	"github.com/NethermindEth/starknet.go/rpc"
	"github.com/NethermindEth/starknet.go/typeddata"
	"github.com/NethermindEth/starknet.go/utils"
)

// createTypedDataAndGetMessageHash builds a SNIP-12 Rev 1 typed data payload
// and returns the message hash for the given account address and message.
func createTypedDataAndGetMessageHash(
	accountAddress string,
	message string,
) (*felt.Felt, error) {
	msgJSON, err := json.Marshal(message)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal message: %w", err)
	}

	rawJSON := []byte(`{
		"types": {
			"StarknetDomain": [
				{"name": "name",     "type": "shortstring"},
				{"name": "chainId",  "type": "shortstring"},
				{"name": "version",  "type": "shortstring"},
				{"name": "revision", "type": "shortstring"}
			],
			"Message": [
				{"name": "message", "type": "felt"}
			]
		},
		"primaryType": "Message",
		"domain": {
			"name":     "Metacube",
			"chainId":  "SN_MAIN",
			"version":  "0.0.1",
			"revision": "1"
		},
		"message": {"message": ` + string(msgJSON) + `}
	}`)

	var ttd typeddata.TypedData
	if err := json.Unmarshal(rawJSON, &ttd); err != nil {
		return nil, fmt.Errorf("failed to parse typed data: %w", err)
	}

	return ttd.GetMessageHash(accountAddress)
}

// VerifySignatures verifies signatures for a given account address and message
func (ctrl *StarknetController) VerifySignatures(
	ctx context.Context,
	accountAddress string,
	message string,
	signature []string,
) (bool, error) {
	accountAddressInFelt, err := utils.HexToFelt(accountAddress)
	if err != nil {
		return false, err
	}

	hash, err := createTypedDataAndGetMessageHash(accountAddress, message)
	if err != nil {
		return false, err
	}

	callData := []*felt.Felt{
		hash,
		(&felt.Felt{}).SetUint64(uint64(len(signature))),
	}

	for _, v := range signature {
		vBigInt, ok := new(big.Int).SetString(v, 10)
		if !ok {
			vBigInt, ok = new(big.Int).SetString(v, 16)
			if !ok {
				vBigInt, ok = new(big.Int).SetString(v, 0)
				if !ok {
					return false, fmt.Errorf(
						"failed to convert signature to big.Int",
					)
				}
			}
		}

		callData = append(callData, utils.BigIntToFelt(vBigInt))
	}

	tx := rpc.FunctionCall{
		ContractAddress: accountAddressInFelt,
		EntryPointSelector: utils.GetSelectorFromNameFelt(
			"is_valid_signature",
		),
		Calldata: callData,
	}

	result, err := ctrl.Client.Call(ctx, tx, rpc.BlockID{Tag: "latest"})
	if err != nil {
		if err.Error() == "Contract not found" {
			return false, fmt.Errorf("contract not found")
		}
		return false, err
	}

	// OKX wallet returns 1 for valid signature
	if result[0].Text(16) == "1" {
		return true, nil
	}

	isValid, err := hex.DecodeString(result[0].Text(16))
	if err != nil {
		return false, err
	}

	return string(isValid) == "VALID", nil
}
