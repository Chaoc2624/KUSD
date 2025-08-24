package service

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"

	"usdk-backend/pkg/contracts"
)

type BlockchainService struct {
	client               *ethclient.Client
	contractConfig       *contracts.ContractConfig
	usdkContract        *contracts.USDKContract
	proofRegistryContract *contracts.ProofRegistryContract
	privateKey          *ecdsa.PrivateKey
	auth               *bind.TransactOpts
}

type TokenInfo struct {
	Name         string `json:"name"`
	Symbol       string `json:"symbol"`
	Decimals     uint8  `json:"decimals"`
	TotalSupply  string `json:"totalSupply"`
	ContractAddr string `json:"contractAddress"`
}

type BalanceInfo struct {
	Address string `json:"address"`
	Balance string `json:"balance"`
}

type ProofBatchInfo struct {
	BatchId        string `json:"batchId"`
	Root           string `json:"root"`
	BatchType      uint8  `json:"batchType"`
	StartTimestamp uint64 `json:"startTimestamp"`
	EndTimestamp   uint64 `json:"endTimestamp"`
	Uri            string `json:"uri"`
	Publisher      string `json:"publisher"`
	EntryCount     uint32 `json:"entryCount"`
	Verified       bool   `json:"verified"`
}

type TransactionResult struct {
	TxHash  string                 `json:"txHash"`
	Success bool                   `json:"success"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

func NewBlockchainService() (*BlockchainService, error) {
	contractConfig := contracts.NewContractConfig()

	// Connect to Ethereum client
	client, err := ethclient.Dial(contractConfig.RPCEndpoint)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Ethereum client: %v", err)
	}

	// Initialize USDK contract
	usdkContract, err := contracts.NewUSDKContract(contractConfig.USDKAddress, client)
	if err != nil {
		return nil, fmt.Errorf("failed to instantiate USDK contract: %v", err)
	}

	// Initialize ProofRegistry contract
	proofRegistryContract, err := contracts.NewProofRegistryContract(contractConfig.ProofRegistryAddress, client)
	if err != nil {
		return nil, fmt.Errorf("failed to instantiate ProofRegistry contract: %v", err)
	}

	service := &BlockchainService{
		client:               client,
		contractConfig:       contractConfig,
		usdkContract:        usdkContract,
		proofRegistryContract: proofRegistryContract,
	}

	return service, nil
}

// SetPrivateKey sets the private key for transactions (optional - for admin operations)
func (bs *BlockchainService) SetPrivateKey(privateKeyHex string) error {
	privateKey, err := crypto.HexToECDSA(privateKeyHex)
	if err != nil {
		return fmt.Errorf("failed to load private key: %v", err)
	}

	// Get chain ID
	chainID, err := bs.client.NetworkID(context.Background())
	if err != nil {
		return fmt.Errorf("failed to get network ID: %v", err)
	}

	// Create transaction authorization
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return fmt.Errorf("failed to create authorized transactor: %v", err)
	}

	bs.privateKey = privateKey
	bs.auth = auth

	return nil
}

// USDK Token Methods

func (bs *BlockchainService) GetTokenInfo() (*TokenInfo, error) {
	name, err := bs.usdkContract.Name(&bind.CallOpts{})
	if err != nil {
		return nil, fmt.Errorf("failed to get token name: %v", err)
	}

	symbol, err := bs.usdkContract.Symbol(&bind.CallOpts{})
	if err != nil {
		return nil, fmt.Errorf("failed to get token symbol: %v", err)
	}

	decimals, err := bs.usdkContract.Decimals(&bind.CallOpts{})
	if err != nil {
		return nil, fmt.Errorf("failed to get token decimals: %v", err)
	}

	totalSupply, err := bs.usdkContract.TotalSupply(&bind.CallOpts{})
	if err != nil {
		return nil, fmt.Errorf("failed to get total supply: %v", err)
	}

	return &TokenInfo{
		Name:         name,
		Symbol:       symbol,
		Decimals:     decimals,
		TotalSupply:  totalSupply.String(),
		ContractAddr: bs.contractConfig.USDKAddress.Hex(),
	}, nil
}

func (bs *BlockchainService) GetBalance(address string) (*BalanceInfo, error) {
	if !common.IsHexAddress(address) {
		return nil, fmt.Errorf("invalid Ethereum address")
	}

	addr := common.HexToAddress(address)
	balance, err := bs.usdkContract.BalanceOf(&bind.CallOpts{}, addr)
	if err != nil {
		return nil, fmt.Errorf("failed to get balance: %v", err)
	}

	return &BalanceInfo{
		Address: address,
		Balance: balance.String(),
	}, nil
}

func (bs *BlockchainService) IsBlacklisted(address string) (bool, error) {
	if !common.IsHexAddress(address) {
		return false, fmt.Errorf("invalid Ethereum address")
	}

	addr := common.HexToAddress(address)
	return bs.usdkContract.IsBlacklisted(&bind.CallOpts{}, addr)
}

func (bs *BlockchainService) IsPaused() (bool, error) {
	return bs.usdkContract.Paused(&bind.CallOpts{})
}

// Transaction methods (require private key)

func (bs *BlockchainService) Transfer(to string, amount *big.Int) (*TransactionResult, error) {
	if bs.auth == nil {
		return nil, fmt.Errorf("private key not set")
	}

	if !common.IsHexAddress(to) {
		return nil, fmt.Errorf("invalid recipient address")
	}

	toAddr := common.HexToAddress(to)
	tx, err := bs.usdkContract.Transfer(bs.auth, toAddr, amount)
	if err != nil {
		return nil, fmt.Errorf("failed to transfer: %v", err)
	}

	return &TransactionResult{
		TxHash:  tx.Hash().Hex(),
		Success: true,
		Data: map[string]interface{}{
			"to":     to,
			"amount": amount.String(),
		},
	}, nil
}

func (bs *BlockchainService) Mint(to string, amount *big.Int) (*TransactionResult, error) {
	if bs.auth == nil {
		return nil, fmt.Errorf("private key not set")
	}

	if !common.IsHexAddress(to) {
		return nil, fmt.Errorf("invalid recipient address")
	}

	toAddr := common.HexToAddress(to)
	tx, err := bs.usdkContract.Mint(bs.auth, toAddr, amount)
	if err != nil {
		return nil, fmt.Errorf("failed to mint: %v", err)
	}

	return &TransactionResult{
		TxHash:  tx.Hash().Hex(),
		Success: true,
		Data: map[string]interface{}{
			"to":     to,
			"amount": amount.String(),
		},
	}, nil
}

func (bs *BlockchainService) Burn(amount *big.Int) (*TransactionResult, error) {
	if bs.auth == nil {
		return nil, fmt.Errorf("private key not set")
	}

	tx, err := bs.usdkContract.Burn(bs.auth, amount)
	if err != nil {
		return nil, fmt.Errorf("failed to burn: %v", err)
	}

	return &TransactionResult{
		TxHash:  tx.Hash().Hex(),
		Success: true,
		Data: map[string]interface{}{
			"amount": amount.String(),
		},
	}, nil
}

// ProofRegistry Methods

func (bs *BlockchainService) GetProofBatch(batchId *big.Int) (*ProofBatchInfo, error) {
	batch, err := bs.proofRegistryContract.GetBatch(&bind.CallOpts{}, batchId)
	if err != nil {
		return nil, fmt.Errorf("failed to get batch: %v", err)
	}

	return &ProofBatchInfo{
		BatchId:        batchId.String(),
		Root:           common.Bytes2Hex(batch.Root[:]),
		BatchType:      batch.BatchType,
		StartTimestamp: batch.StartTimestamp,
		EndTimestamp:   batch.EndTimestamp,
		Uri:            batch.Uri,
		Publisher:      batch.Publisher.Hex(),
		EntryCount:     batch.EntryCount,
		Verified:       batch.Verified,
	}, nil
}

func (bs *BlockchainService) GetBatchCount() (*big.Int, error) {
	return bs.proofRegistryContract.GetBatchCount(&bind.CallOpts{})
}

func (bs *BlockchainService) GetBatchCountByType(batchType uint8) (*big.Int, error) {
	return bs.proofRegistryContract.GetBatchCountByType(&bind.CallOpts{}, batchType)
}

func (bs *BlockchainService) GetBatchesByType(batchType uint8, offset, limit *big.Int) ([]*big.Int, error) {
	return bs.proofRegistryContract.GetBatchesByType(&bind.CallOpts{}, batchType, offset, limit)
}

func (bs *BlockchainService) VerifyProof(batchId *big.Int, leaf [32]byte, proof [][32]byte) (bool, error) {
	return bs.proofRegistryContract.VerifyProof(&bind.CallOpts{}, batchId, leaf, proof)
}

// Utility Methods

func (bs *BlockchainService) GetTransactionStatus(txHash string) (map[string]interface{}, error) {
	hash := common.HexToHash(txHash)

	receipt, err := bs.client.TransactionReceipt(context.Background(), hash)
	if err != nil {
		return nil, fmt.Errorf("transaction not found: %v", err)
	}

	status := "failed"
	if receipt.Status == 1 {
		status = "success"
	}

	return map[string]interface{}{
		"txHash":      txHash,
		"status":      status,
		"blockNumber": receipt.BlockNumber.String(),
		"gasUsed":     receipt.GasUsed,
	}, nil
}

func (bs *BlockchainService) HealthCheck() error {
	_, err := bs.client.NetworkID(context.Background())
	return err
}