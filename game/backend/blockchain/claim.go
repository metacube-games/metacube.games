package blockchain

import (
	"context"
	"fmt"
	"time"

	"github.com/NethermindEth/juno/core/felt"
	"github.com/NethermindEth/starknet.go/account"
	"github.com/NethermindEth/starknet.go/rpc"
	"github.com/NethermindEth/starknet.go/utils"
)

const STRK_CONTRACT_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb2" +
	"0c31f5cd61d6ab07201858f4287c938d"
const AMOUNT = 40000000000000000 // 0.04 STRK

type Claim struct {
	accnt           *account.Account
	contractAddress *felt.Felt
	maxFee          uint64
	inChan          <-chan string // address of the user
}

func NewClaim(
	accnt *account.Account,
	maxFee uint64,
	inChan <-chan string,
) *Claim {
	contractAddressInFelt, err := utils.HexToFelt(STRK_CONTRACT_ADDRESS)
	if err != nil {
		return nil
	}

	return &Claim{
		accnt:           accnt,
		contractAddress: contractAddressInFelt,
		maxFee:          maxFee,
		inChan:          inChan,
	}
}

func (c *Claim) Run() {
	go c.runClaimActor()
}

//------------------------------------------------------------------------------
// Custom Printf functions
//------------------------------------------------------------------------------

func (c *Claim) claimPrintf(index int, args ...any) {
	color := colors[index]
	fmt.Printf("%sClaim   | claim actor | ", color)
	fmt.Print(args...)
	fmt.Printf("%s\n", reset)
}

//------------------------------------------------------------------------------
// Claim methods
//------------------------------------------------------------------------------

func (c *Claim) buildFunctionCall(address string) (*rpc.FunctionCall, error) {
	toAddressInFelt, err := utils.HexToFelt(address)
	if err != nil {
		return nil, fmt.Errorf(
			"error converting the to address to Felt: %v", err,
		)
	}

	return &rpc.FunctionCall{
		ContractAddress: c.contractAddress,
		EntryPointSelector: utils.GetSelectorFromNameFelt(
			"transfer",
		),
		Calldata: []*felt.Felt{
			toAddressInFelt,
			new(felt.Felt).SetUint64(AMOUNT),
			new(felt.Felt).SetUint64(0), // extra data -> None
		},
	}, nil
}

func (c *Claim) buildClaimTransaction(
	functionCall rpc.FunctionCall,
) (rpc.InvokeTxnV3, error) {
	calldata, err := c.accnt.FmtCalldata([]rpc.FunctionCall{functionCall})
	if err != nil {
		return rpc.InvokeTxnV3{}, fmt.Errorf(
			"error formatting the calldata: %v", err,
		)
	}

	// 15k gas units for L1 (buffer, actual uses 0)
	l1GasMaxAmount := fmt.Sprintf("0x%x", uint64(15000))
	// 1.8M gas units for L2 (actual uses 1.65M)
	l2GasMaxAmount := fmt.Sprintf("0x%x", uint64(1800000))
	// 1k units for L1 data (actual uses 736)
	l1DataGasMaxAmount := fmt.Sprintf("0x%x", uint64(1000))
	// 50,000 gwei cap (actual much lower)
	maxPricePerUnit := fmt.Sprintf("0x%x", uint64(50000000000000))

	return rpc.InvokeTxnV3{
		Type:          rpc.TransactionTypeInvoke,
		SenderAddress: c.accnt.Address,
		Calldata:      calldata,
		Version:       rpc.TransactionV3,
		Signature:     []*felt.Felt{},
		Nonce:         new(felt.Felt).SetUint64(0), // Will be set later
		ResourceBounds: &rpc.ResourceBoundsMapping{
			L1Gas: rpc.ResourceBounds{
				MaxAmount:       rpc.U64(l1GasMaxAmount),
				MaxPricePerUnit: rpc.U128(maxPricePerUnit),
			},
			L1DataGas: rpc.ResourceBounds{
				MaxAmount:       rpc.U64(l1DataGasMaxAmount),
				MaxPricePerUnit: rpc.U128(maxPricePerUnit),
			},
			L2Gas: rpc.ResourceBounds{
				MaxAmount:       rpc.U64(l2GasMaxAmount),
				MaxPricePerUnit: rpc.U128(maxPricePerUnit),
			},
		},
		Tip:                   rpc.U64("0x0"),
		PayMasterData:         []*felt.Felt{},
		AccountDeploymentData: []*felt.Felt{},
		NonceDataMode:         rpc.DAModeL1,
		FeeMode:               rpc.DAModeL1,
	}, nil
}

func (c *Claim) runClaimActor() {
	fmt.Println("Claim   | claim actor | Starting actor")

	index := 0
	oldNonce := new(felt.Felt).SetUint64(0)

	for address := range c.inChan {
		c.claimPrintf(index, fmt.Sprintf("Received new address: %s", address))

		functionCall, err := c.buildFunctionCall(address)
		if err != nil {
			c.claimPrintf(index,
				fmt.Sprintf("Error building function call: %v", err))
			continue
		}

		c.claimPrintf(index, "Function call built")

		txn, err := c.buildClaimTransaction(*functionCall)
		if err != nil {
			c.claimPrintf(index,
				fmt.Sprintf("Error building claim transaction: %v", err))
			continue
		}

		c.claimPrintf(index, "Claim transaction built")

		nonceCtx, nonceCancel := context.WithTimeout(
			context.Background(), 5*time.Second)
		nonce, err := c.accnt.Provider.Nonce(
			nonceCtx,
			rpc.WithBlockTag("latest"),
			c.accnt.Address,
		)
		nonceCancel()
		if err != nil {
			c.claimPrintf(index,
				fmt.Sprintf("Error getting the account nonce: %v", err))
			continue
		}

		if nonce.Cmp(oldNonce) <= 0 {
			// The nonce has not been updated yet, update it manually
			nonce.Add(oldNonce, new(felt.Felt).SetUint64(1))
		}

		c.claimPrintf(index, fmt.Sprintf("Account nonce: %s", nonce.Text(10)))
		txn.Nonce = nonce

		signCtx, signCancel := context.WithTimeout(
			context.Background(), 5*time.Second)
		err = c.accnt.SignInvokeTransaction(
			signCtx,
			&txn,
		)
		signCancel()
		if err != nil {
			c.claimPrintf(index,
				fmt.Sprintf("Error signing the transaction: %v", err))
			continue
		}

		c.claimPrintf(index, "Transaction signed")

		sendCtx, sendCancel := context.WithTimeout(
			context.Background(), 5*time.Second)
		resp, err := c.accnt.SendTransaction(
			sendCtx,
			&txn,
		)
		sendCancel()
		if err != nil {
			c.claimPrintf(index,
				fmt.Sprintf("Error adding the transaction: %v", err))
			continue
		}

		c.claimPrintf(index, "Transaction submitted")
		c.claimPrintf(index, fmt.Sprintf("Transaction hash: %s", resp.Hash))

		statusErrs := 0
	statusLoop:
		for {
			time.Sleep(time.Second * 5)

			statusCtx, statusCancel := context.WithTimeout(
				context.Background(), 5*time.Second)
			txStatus, err := c.accnt.Provider.TransactionStatus(
				statusCtx,
				resp.Hash,
			)
			statusCancel()
			if err != nil {
				statusErrs++
				c.claimPrintf(index, fmt.Sprintf(
					"Transient status error (%d/6): %v", statusErrs, err))
				if statusErrs >= 6 {
					break
				}
				continue
			}
			statusErrs = 0

			// NOTE: status can be empty
			c.claimPrintf(index, fmt.Sprintf(
				"Transaction execution status: %s", txStatus.ExecutionStatus))
			c.claimPrintf(index, fmt.Sprintf(
				"Transaction finality status: %s", txStatus.FinalityStatus))

			switch txStatus.ExecutionStatus {
			case rpc.TxnExecutionStatusSUCCEEDED:
				c.claimPrintf(index, "Transaction succeeded")
				oldNonce = nonce
				break statusLoop
			case rpc.TxnExecutionStatusREVERTED:
				c.claimPrintf(index, "Transaction reverted")
				oldNonce = nonce // A reverted transaction consumes the nonce
				break statusLoop
			default:
			}

			switch txStatus.FinalityStatus {
			case rpc.TxnStatusReceived:
				continue
			case rpc.TxnStatusAcceptedOnL2, rpc.TxnStatusAcceptedOnL1:
				c.claimPrintf(index, "Transaction succeeded")
				oldNonce = nonce
				break statusLoop
			default:
			}
		}
	}

	fmt.Println("Claim   | claim actor | Exiting actor")
}
