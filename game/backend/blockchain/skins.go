package blockchain

import (
	"context"

	"github.com/NethermindEth/juno/core/felt"
	"github.com/NethermindEth/starknet.go/rpc"
	"github.com/NethermindEth/starknet.go/utils"
)

const DEFAULT_SKIN_ID = 0
const PASSCARD_SKIN_ID = 1
const GENESIS_SKIN_ID = 2
const BROTHER_SKIN_ID = 3

type SkinsHandler struct {
	passcardSkinContractAddress *felt.Felt
	genesisSkinContractAddress  *felt.Felt
	brotherSkinContractAddress  *felt.Felt
}

func NewSkinsHandler(
	passcardSkinContractAddress string,
	genesisSkinContractAddress string,
	brotherSkinContractAddress string,
) (*SkinsHandler, error) {
	passcardSkinContractAddressInFelt, err := utils.HexToFelt(
		passcardSkinContractAddress,
	)
	if err != nil {
		return nil, err
	}

	genesisSkinContractAddressInFelt, err := utils.HexToFelt(
		genesisSkinContractAddress,
	)
	if err != nil {
		return nil, err
	}

	brotherSkinContractAddressInFelt, err := utils.HexToFelt(
		brotherSkinContractAddress,
	)
	if err != nil {
		return nil, err
	}

	return &SkinsHandler{
		passcardSkinContractAddress: passcardSkinContractAddressInFelt,
		genesisSkinContractAddress:  genesisSkinContractAddressInFelt,
		brotherSkinContractAddress:  brotherSkinContractAddressInFelt,
	}, nil
}

func (ctrl *StarknetController) GetSkins(
	ctx context.Context,
	accountAddress string,
) ([]uint8, error) {
	accountAddressInFelt, err := utils.HexToFelt(accountAddress)
	if err != nil {
		return nil, err
	}

	callData := []*felt.Felt{
		accountAddressInFelt,
	}

	tx := rpc.FunctionCall{
		ContractAddress: ctrl.SkinsHandler.passcardSkinContractAddress,
		EntryPointSelector: utils.GetSelectorFromNameFelt(
			"balance_of",
		),
		Calldata: callData,
	}

	result, err := ctrl.Client.Call(ctx, tx, rpc.BlockID{Tag: "latest"})
	if err != nil || len(result) == 0 {
		return nil, err
	}

	hasPasscardSkin := result[0].Uint64() > 0

	tx = rpc.FunctionCall{
		ContractAddress: ctrl.SkinsHandler.genesisSkinContractAddress,
		EntryPointSelector: utils.GetSelectorFromNameFelt(
			"balance_of",
		),
		Calldata: callData,
	}

	result, err = ctrl.Client.Call(ctx, tx, rpc.BlockID{Tag: "latest"})
	if err != nil || len(result) == 0 {
		return nil, err
	}

	hasGenesisSkin := result[0].Uint64() > 0

	tx = rpc.FunctionCall{
		ContractAddress: ctrl.SkinsHandler.brotherSkinContractAddress,
		EntryPointSelector: utils.GetSelectorFromNameFelt(
			"balance_of",
		),
		Calldata: callData,
	}
	result, err = ctrl.Client.Call(ctx, tx, rpc.BlockID{Tag: "latest"})

	if err != nil || len(result) == 0 {
		return nil, err
	}

	hasBrotherSkin := result[0].Uint64() > 0

	skins := []uint8{DEFAULT_SKIN_ID}
	if hasPasscardSkin {
		skins = append(skins, PASSCARD_SKIN_ID)
	}
	if hasGenesisSkin {
		skins = append(skins, GENESIS_SKIN_ID)
	}
	if hasBrotherSkin {
		skins = append(skins, BROTHER_SKIN_ID)
	}
	return skins, nil
}
