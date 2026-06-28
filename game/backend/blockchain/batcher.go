package blockchain

import (
	"context"
	"encoding/csv"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/NethermindEth/juno/core/felt"
	"github.com/NethermindEth/starknet.go/account"
	"github.com/NethermindEth/starknet.go/rpc"
	"github.com/NethermindEth/starknet.go/utils"
)

type Batcher struct {
	accnt           *account.Account
	contractAddress *felt.Felt
	maxSize         int
	maxFee          uint64
	waitingTime     time.Duration
	inChan          <-chan NFT_tx
	failChan        chan<- NFT_tx
}

func NewBatcher(
	accnt *account.Account,
	contractAddress *felt.Felt,
	maxSize int,
	maxFee uint64,
	waitingTime time.Duration,
	inChan <-chan NFT_tx,
	failChan chan<- NFT_tx,
) *Batcher {
	return &Batcher{
		accnt:           accnt,
		contractAddress: contractAddress,
		maxSize:         maxSize,
		maxFee:          maxFee,
		waitingTime:     waitingTime,
		inChan:          inChan,
		failChan:        failChan,
	}
}

type TxnDataPair struct {
	Txn  rpc.InvokeTxnV3
	Data []NFT_tx
}

func (b *Batcher) Run() {
	txnDataPairChan := make(chan TxnDataPair)

	go b.runBuildActor(txnDataPairChan)
	go b.runSendActor(txnDataPairChan)
}

func HandleFailures(envFile map[string]string, failChan <-chan NFT_tx) {
	failedTxnsFile, err := os.OpenFile(
		envFile["BACKEND_API_STARKNET_FAIL_TXNS_DIR_PATH"]+"failed_txns.txt",
		os.O_RDWR|os.O_CREATE,
		0666,
	)
	if err != nil {
		slog.Error("failed to open failed_txns.txt", "err", err)
		os.Exit(1)
	}
	defer failedTxnsFile.Close()

	writer := csv.NewWriter(failedTxnsFile)

	for {
		data, ok := <-failChan
		if !ok {
			break
		}

		err := writer.Write([]string{data.To, fmt.Sprintf("%d", data.TokenID)})
		if err != nil {
			fmt.Println("Error writing to the file: ", err)
		}
		writer.Flush()
	}
}

//------------------------------------------------------------------------------
// Custom Printf functions
//------------------------------------------------------------------------------

func (b *Batcher) buildPrintf(index int, args ...any) {
	color := colors[index]
	fmt.Printf("%sBatcher | build actor | ", color)
	fmt.Print(args...)
	fmt.Printf("%s\n", reset)
}

func (b *Batcher) sendPrintf(index int, args ...any) {
	color := colors[index]
	fmt.Printf("%sBatcher |  send actor | ", color)
	fmt.Print(args...)
	fmt.Printf("%s\n", reset)
}

//------------------------------------------------------------------------------
// Builder methods
//------------------------------------------------------------------------------

func (b *Batcher) buildFunctionCall(data NFT_tx) (*rpc.FunctionCall, error) {
	toAddressInFelt, err := utils.HexToFelt(data.To)
	if err != nil {
		return nil, fmt.Errorf(
			"error converting the to address to Felt: %v", err,
		)
	}

	return &rpc.FunctionCall{
		ContractAddress: b.contractAddress,
		EntryPointSelector: utils.GetSelectorFromNameFelt(
			"transfer_from",
		),
		Calldata: []*felt.Felt{
			b.accnt.Address,
			toAddressInFelt,
			new(felt.Felt).SetUint64(data.TokenID),
			new(felt.Felt).SetUint64(0), // extra data -> None
		},
	}, nil
}

func (b *Batcher) buildBatchTransaction(
	functionCalls []rpc.FunctionCall,
) (rpc.InvokeTxnV3, error) {
	calldata, err := b.accnt.FmtCalldata(functionCalls)
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
		SenderAddress: b.accnt.Address,
		Calldata:      calldata,
		Version:       rpc.TransactionV3,
		Signature:     []*felt.Felt{},
		// Will be set by the send actor
		Nonce: new(felt.Felt).SetUint64(0),
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

func (b *Batcher) runBuildActor(txnDataPairChan chan<- TxnDataPair) {
	fmt.Println("Batcher | build actor | Starting actor")

	index := 0
	size := 0
	functionCalls := make([]rpc.FunctionCall, 0, b.maxSize)
	currentData := make([]NFT_tx, 0, b.maxSize)

mainLoop:
	for {
		trigger := false

		select {
		case data, ok := <-b.inChan:
			if !ok {
				break mainLoop
			}

			b.buildPrintf(index, "Received new data")

			functionCall, err := b.buildFunctionCall(data)
			if err != nil {
				b.buildPrintf(index,
					fmt.Sprintf("Error building function call: %v", err))
				b.failChan <- data
				continue
			}

			b.buildPrintf(index, "Function call built")

			functionCalls = append(functionCalls, *functionCall)
			size++
			currentData = append(currentData, data)

			if size >= b.maxSize {
				b.buildPrintf(index, "Batch size reached")
				trigger = true
			}

		case <-time.After(b.waitingTime):
			if size > 0 {
				b.buildPrintf(index, "Timeout reached")
				trigger = true
			}
		}

		if trigger {
			builtTxn, err := b.buildBatchTransaction(functionCalls)
			if err != nil {
				b.buildPrintf(index,
					fmt.Sprintf("Error building batch transaction: %v", err))
				for _, data := range currentData {
					b.failChan <- data
				}
			} else {
				b.buildPrintf(index, "Batch transaction built")

				txnDataPairChan <- TxnDataPair{
					Txn:  builtTxn,
					Data: currentData,
				}

				b.buildPrintf(index, "Batch transaction sent to send actor")
			}

			index = (index + 1) % len(colors)
			size = 0
			functionCalls = make([]rpc.FunctionCall, 0, b.maxSize)
			currentData = make([]NFT_tx, 0, b.maxSize)
		}
	}

	fmt.Println("Batcher | build actor | Exiting actor")
}

//------------------------------------------------------------------------------
// Send methods
//------------------------------------------------------------------------------

func (b *Batcher) runSendActor(txnDataPairChan <-chan TxnDataPair) {
	fmt.Println("Batcher |  send actor | Starting actor")

	index := len(colors) - 1
	oldNonce := new(felt.Felt).SetUint64(0)

	for {
		index = (index + 1) % len(colors)

		txnDataPair, ok := <-txnDataPairChan
		if !ok {
			break
		}
		txn := txnDataPair.Txn
		data := txnDataPair.Data

		b.sendPrintf(index, "Received new batch transaction")

		nonceCtx, nonceCancel := context.WithTimeout(
			context.Background(), 5*time.Second)
		nonce, err := b.accnt.Provider.Nonce(
			nonceCtx,
			rpc.WithBlockTag("latest"),
			b.accnt.Address,
		)
		nonceCancel()
		if err != nil {
			b.sendPrintf(index,
				fmt.Sprintf("Error getting the account nonce: %v", err))
			for _, data := range data {
				b.failChan <- data
			}
			continue
		}

		if nonce.Cmp(oldNonce) <= 0 {
			// The nonce has not been updated yet, update it manually
			nonce.Add(oldNonce, new(felt.Felt).SetUint64(1))
		}

		b.sendPrintf(index, fmt.Sprintf("Account nonce: %s", nonce.Text(10)))
		txn.Nonce = nonce

		signCtx, signCancel := context.WithTimeout(
			context.Background(), 5*time.Second)
		err = b.accnt.SignInvokeTransaction(
			signCtx,
			&txn,
		)
		signCancel()
		if err != nil {
			b.sendPrintf(index,
				fmt.Sprintf("Error signing the transaction: %v", err))
			for _, data := range data {
				b.failChan <- data
			}
			continue
		}

		b.sendPrintf(index, "Transaction signed")

		sendCtx, sendCancel := context.WithTimeout(
			context.Background(), 5*time.Second)
		resp, err := b.accnt.SendTransaction(
			sendCtx,
			&txn,
		)
		sendCancel()
		if err != nil {
			b.sendPrintf(index,
				fmt.Sprintf("Error adding the transaction: %v", err))
			for _, data := range data {
				b.failChan <- data
			}
			continue
		}

		b.sendPrintf(index, "Transaction submitted")
		b.sendPrintf(index, fmt.Sprintf("Transaction hash: %s", resp.Hash))

		statusErrs := 0
	statusLoop:
		for {
			time.Sleep(time.Second * 5)

			statusCtx, statusCancel := context.WithTimeout(
				context.Background(), 5*time.Second)
			txStatus, err := b.accnt.Provider.TransactionStatus(
				statusCtx,
				resp.Hash,
			)
			statusCancel()
			if err != nil {
				statusErrs++
				b.sendPrintf(index, fmt.Sprintf(
					"Transient status error (%d/6): %v", statusErrs, err))
				if statusErrs >= 6 {
					for _, data := range data {
						b.failChan <- data
					}
					break
				}
				continue
			}
			statusErrs = 0

			// NOTE: status can be empty
			b.sendPrintf(index, fmt.Sprintf(
				"Transaction execution status: %s", txStatus.ExecutionStatus))
			b.sendPrintf(index, fmt.Sprintf(
				"Transaction finality status: %s", txStatus.FinalityStatus))

			switch txStatus.ExecutionStatus {
			case rpc.TxnExecutionStatusSUCCEEDED:
				b.sendPrintf(index, "Transaction succeeded")
				oldNonce = nonce
				break statusLoop
			case rpc.TxnExecutionStatusREVERTED:
				b.sendPrintf(index, "Transaction reverted")
				oldNonce = nonce // A reverted transaction consumes the nonce
				for _, data := range data {
					b.failChan <- data
				}
				break statusLoop
			default:
			}

			switch txStatus.FinalityStatus {
			case rpc.TxnStatusReceived:
				continue
			case rpc.TxnStatusAcceptedOnL2, rpc.TxnStatusAcceptedOnL1:
				b.sendPrintf(index, "Transaction succeeded")
				oldNonce = nonce
				break statusLoop
			default:
			}
		}
	}

	fmt.Println("Batcher |  send actor | Exiting actor")
}
