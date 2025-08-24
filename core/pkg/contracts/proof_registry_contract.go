// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package contracts

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// ProofRegistryBatch is an auto generated low-level Go binding around an user-defined struct.
type ProofRegistryBatch struct {
	Root           [32]byte
	BatchType      uint8
	StartTimestamp uint64
	EndTimestamp   uint64
	Uri            string
	Publisher      common.Address
	EntryCount     uint32
	Verified       bool
}

// ProofRegistryContractMetaData contains all meta data concerning the ProofRegistryContract contract.
var ProofRegistryContractMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"defaultAdmin\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"oracle\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"inputs\":[],\"name\":\"AccessControlBadConfirmation\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"},{\"internalType\":\"bytes32\",\"name\":\"neededRole\",\"type\":\"bytes32\"}],\"name\":\"AccessControlUnauthorizedAccount\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EnforcedPause\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ExpectedPause\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ReentrancyGuardReentrantCall\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"batchId\",\"type\":\"uint256\"},{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"root\",\"type\":\"bytes32\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"reason\",\"type\":\"string\"}],\"name\":\"BatchRevoked\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"batchId\",\"type\":\"uint256\"},{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"root\",\"type\":\"bytes32\"}],\"name\":\"BatchVerified\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Paused\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"uint256\",\"name\":\"batchId\",\"type\":\"uint256\"},{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"root\",\"type\":\"bytes32\"},{\"indexed\":true,\"internalType\":\"enumProofRegistry.BatchType\",\"name\":\"batchType\",\"type\":\"uint8\"},{\"indexed\":false,\"internalType\":\"uint64\",\"name\":\"startTimestamp\",\"type\":\"uint64\"},{\"indexed\":false,\"internalType\":\"uint64\",\"name\":\"endTimestamp\",\"type\":\"uint64\"},{\"indexed\":false,\"internalType\":\"string\",\"name\":\"uri\",\"type\":\"string\"},{\"indexed\":false,\"internalType\":\"address\",\"name\":\"publisher\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint32\",\"name\":\"entryCount\",\"type\":\"uint32\"}],\"name\":\"ProofPublished\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"role\",\"type\":\"bytes32\"},{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"previousAdminRole\",\"type\":\"bytes32\"},{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"newAdminRole\",\"type\":\"bytes32\"}],\"name\":\"RoleAdminChanged\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"role\",\"type\":\"bytes32\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"sender\",\"type\":\"address\"}],\"name\":\"RoleGranted\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"bytes32\",\"name\":\"role\",\"type\":\"bytes32\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"sender\",\"type\":\"address\"}],\"name\":\"RoleRevoked\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"Unpaused\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"DEFAULT_ADMIN_ROLE\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"ORACLE_ROLE\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"PAUSER_ROLE\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"batches\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"root\",\"type\":\"bytes32\"},{\"internalType\":\"enumProofRegistry.BatchType\",\"name\":\"batchType\",\"type\":\"uint8\"},{\"internalType\":\"uint64\",\"name\":\"startTimestamp\",\"type\":\"uint64\"},{\"internalType\":\"uint64\",\"name\":\"endTimestamp\",\"type\":\"uint64\"},{\"internalType\":\"string\",\"name\":\"uri\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"publisher\",\"type\":\"address\"},{\"internalType\":\"uint32\",\"name\":\"entryCount\",\"type\":\"uint32\"},{\"internalType\":\"bool\",\"name\":\"verified\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"enumProofRegistry.BatchType\",\"name\":\"\",\"type\":\"uint8\"},{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"name\":\"batchesByType\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"batchId\",\"type\":\"uint256\"}],\"name\":\"getBatch\",\"outputs\":[{\"components\":[{\"internalType\":\"bytes32\",\"name\":\"root\",\"type\":\"bytes32\"},{\"internalType\":\"enumProofRegistry.BatchType\",\"name\":\"batchType\",\"type\":\"uint8\"},{\"internalType\":\"uint64\",\"name\":\"startTimestamp\",\"type\":\"uint64\"},{\"internalType\":\"uint64\",\"name\":\"endTimestamp\",\"type\":\"uint64\"},{\"internalType\":\"string\",\"name\":\"uri\",\"type\":\"string\"},{\"internalType\":\"address\",\"name\":\"publisher\",\"type\":\"address\"},{\"internalType\":\"uint32\",\"name\":\"entryCount\",\"type\":\"uint32\"},{\"internalType\":\"bool\",\"name\":\"verified\",\"type\":\"bool\"}],\"internalType\":\"structProofRegistry.Batch\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"getBatchCount\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint8\",\"name\":\"batchType\",\"type\":\"uint8\"}],\"name\":\"getBatchCountByType\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"root\",\"type\":\"bytes32\"}],\"name\":\"getBatchIdByRoot\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint8\",\"name\":\"batchType\",\"type\":\"uint8\"},{\"internalType\":\"uint256\",\"name\":\"offset\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"limit\",\"type\":\"uint256\"}],\"name\":\"getBatchesByType\",\"outputs\":[{\"internalType\":\"uint256[]\",\"name\":\"batchIds\",\"type\":\"uint256[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"role\",\"type\":\"bytes32\"}],\"name\":\"getRoleAdmin\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"role\",\"type\":\"bytes32\"},{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"grantRole\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"role\",\"type\":\"bytes32\"},{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"hasRole\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"nextBatchId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"pause\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"root\",\"type\":\"bytes32\"},{\"internalType\":\"uint8\",\"name\":\"batchType\",\"type\":\"uint8\"},{\"internalType\":\"uint64\",\"name\":\"startTimestamp\",\"type\":\"uint64\"},{\"internalType\":\"uint64\",\"name\":\"endTimestamp\",\"type\":\"uint64\"},{\"internalType\":\"string\",\"name\":\"uri\",\"type\":\"string\"},{\"internalType\":\"uint32\",\"name\":\"entryCount\",\"type\":\"uint32\"}],\"name\":\"publishBatch\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"batchId\",\"type\":\"uint256\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"role\",\"type\":\"bytes32\"},{\"internalType\":\"address\",\"name\":\"callerConfirmation\",\"type\":\"address\"}],\"name\":\"renounceRole\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"batchId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"reason\",\"type\":\"string\"}],\"name\":\"revokeBatch\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"role\",\"type\":\"bytes32\"},{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"revokeRole\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"name\":\"rootToBatchId\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bytes4\",\"name\":\"interfaceId\",\"type\":\"bytes4\"}],\"name\":\"supportsInterface\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"unpause\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"batchId\",\"type\":\"uint256\"}],\"name\":\"verifyBatch\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"batchId\",\"type\":\"uint256\"},{\"internalType\":\"bytes32\",\"name\":\"leaf\",\"type\":\"bytes32\"},{\"internalType\":\"bytes32[]\",\"name\":\"proof\",\"type\":\"bytes32[]\"}],\"name\":\"verifyProof\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
}

// ProofRegistryContractABI is the input ABI used to generate the binding from.
// Deprecated: Use ProofRegistryContractMetaData.ABI instead.
var ProofRegistryContractABI = ProofRegistryContractMetaData.ABI

// ProofRegistryContract is an auto generated Go binding around an Ethereum contract.
type ProofRegistryContract struct {
	ProofRegistryContractCaller     // Read-only binding to the contract
	ProofRegistryContractTransactor // Write-only binding to the contract
	ProofRegistryContractFilterer   // Log filterer for contract events
}

// ProofRegistryContractCaller is an auto generated read-only Go binding around an Ethereum contract.
type ProofRegistryContractCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ProofRegistryContractTransactor is an auto generated write-only Go binding around an Ethereum contract.
type ProofRegistryContractTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// ProofRegistryContractFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type ProofRegistryContractFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// NewProofRegistryContract creates a new instance of ProofRegistryContract, bound to a specific deployed contract.
func NewProofRegistryContract(address common.Address, backend bind.ContractBackend) (*ProofRegistryContract, error) {
	contract, err := bindProofRegistryContract(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &ProofRegistryContract{ProofRegistryContractCaller: ProofRegistryContractCaller{contract: contract}, ProofRegistryContractTransactor: ProofRegistryContractTransactor{contract: contract}, ProofRegistryContractFilterer: ProofRegistryContractFilterer{contract: contract}}, nil
}

// NewProofRegistryContractCaller creates a new read-only instance of ProofRegistryContract, bound to a specific deployed contract.
func NewProofRegistryContractCaller(address common.Address, caller bind.ContractCaller) (*ProofRegistryContractCaller, error) {
	contract, err := bindProofRegistryContract(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &ProofRegistryContractCaller{contract: contract}, nil
}

// NewProofRegistryContractTransactor creates a new write-only instance of ProofRegistryContract, bound to a specific deployed contract.
func NewProofRegistryContractTransactor(address common.Address, transactor bind.ContractTransactor) (*ProofRegistryContractTransactor, error) {
	contract, err := bindProofRegistryContract(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &ProofRegistryContractTransactor{contract: contract}, nil
}

// NewProofRegistryContractFilterer creates a new log filterer instance of ProofRegistryContract, bound to a specific deployed contract.
func NewProofRegistryContractFilterer(address common.Address, filterer bind.ContractFilterer) (*ProofRegistryContractFilterer, error) {
	contract, err := bindProofRegistryContract(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &ProofRegistryContractFilterer{contract: contract}, nil
}

// bindProofRegistryContract binds a generic wrapper to an already deployed contract.
func bindProofRegistryContract(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := abi.JSON(strings.NewReader(ProofRegistryContractABI))
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, parsed, caller, transactor, filterer), nil
}

// GetBatch retrieves batch information by batch ID.
func (pr *ProofRegistryContractCaller) GetBatch(opts *bind.CallOpts, batchId *big.Int) (ProofRegistryBatch, error) {
	var out []interface{}
	err := pr.contract.Call(opts, &out, "getBatch", batchId)
	
	outstruct := new(ProofRegistryBatch)
	if err != nil {
		return *outstruct, err
	}
	
	outstruct.Root = *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)
	outstruct.BatchType = *abi.ConvertType(out[1], new(uint8)).(*uint8)
	outstruct.StartTimestamp = *abi.ConvertType(out[2], new(uint64)).(*uint64)
	outstruct.EndTimestamp = *abi.ConvertType(out[3], new(uint64)).(*uint64)
	outstruct.Uri = *abi.ConvertType(out[4], new(string)).(*string)
	outstruct.Publisher = *abi.ConvertType(out[5], new(common.Address)).(*common.Address)
	outstruct.EntryCount = *abi.ConvertType(out[6], new(uint32)).(*uint32)
	outstruct.Verified = *abi.ConvertType(out[7], new(bool)).(*bool)
	
	return *outstruct, err
}

// GetBatchCount retrieves the total number of batches.
func (pr *ProofRegistryContractCaller) GetBatchCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := pr.contract.Call(opts, &out, "getBatchCount")
	if err != nil {
		return nil, err
	}
	return *abi.ConvertType(out[0], new(*big.Int)).(**big.Int), nil
}

// GetBatchCountByType retrieves the number of batches by type.
func (pr *ProofRegistryContractCaller) GetBatchCountByType(opts *bind.CallOpts, batchType uint8) (*big.Int, error) {
	var out []interface{}
	err := pr.contract.Call(opts, &out, "getBatchCountByType", batchType)
	if err != nil {
		return nil, err
	}
	return *abi.ConvertType(out[0], new(*big.Int)).(**big.Int), nil
}

// GetBatchesByType retrieves batch IDs by type with pagination.
func (pr *ProofRegistryContractCaller) GetBatchesByType(opts *bind.CallOpts, batchType uint8, offset *big.Int, limit *big.Int) ([]*big.Int, error) {
	var out []interface{}
	err := pr.contract.Call(opts, &out, "getBatchesByType", batchType, offset, limit)
	if err != nil {
		return nil, err
	}
	return *abi.ConvertType(out[0], new([]*big.Int)).(*[]*big.Int), nil
}

// Paused checks if the contract is paused.
func (pr *ProofRegistryContractCaller) Paused(opts *bind.CallOpts) (bool, error) {
	var out []interface{}
	err := pr.contract.Call(opts, &out, "paused")
	if err != nil {
		return false, err
	}
	return *abi.ConvertType(out[0], new(bool)).(*bool), nil
}

// VerifyProof verifies a merkle proof against a batch.
func (pr *ProofRegistryContractCaller) VerifyProof(opts *bind.CallOpts, batchId *big.Int, leaf [32]byte, proof [][32]byte) (bool, error) {
	var out []interface{}
	err := pr.contract.Call(opts, &out, "verifyProof", batchId, leaf, proof)
	if err != nil {
		return false, err
	}
	return *abi.ConvertType(out[0], new(bool)).(*bool), nil
}

// PublishBatch publishes a new proof batch (requires proper permissions).
func (pr *ProofRegistryContractTransactor) PublishBatch(opts *bind.TransactOpts, root [32]byte, batchType uint8, startTimestamp uint64, endTimestamp uint64, uri string, entryCount uint32) (*types.Transaction, error) {
	return pr.contract.Transact(opts, "publishBatch", root, batchType, startTimestamp, endTimestamp, uri, entryCount)
}

// VerifyBatch marks a batch as verified (requires ORACLE_ROLE).
func (pr *ProofRegistryContractTransactor) VerifyBatch(opts *bind.TransactOpts, batchId *big.Int) (*types.Transaction, error) {
	return pr.contract.Transact(opts, "verifyBatch", batchId)
}

// RevokeBatch revokes a batch with a reason (requires proper permissions).
func (pr *ProofRegistryContractTransactor) RevokeBatch(opts *bind.TransactOpts, batchId *big.Int, reason string) (*types.Transaction, error) {
	return pr.contract.Transact(opts, "revokeBatch", batchId, reason)
}

// Pause pauses the contract (requires PAUSER_ROLE).
func (pr *ProofRegistryContractTransactor) Pause(opts *bind.TransactOpts) (*types.Transaction, error) {
	return pr.contract.Transact(opts, "pause")
}

// Unpause unpauses the contract (requires PAUSER_ROLE).
func (pr *ProofRegistryContractTransactor) Unpause(opts *bind.TransactOpts) (*types.Transaction, error) {
	return pr.contract.Transact(opts, "unpause")
}