package contracts

import (
	"os"

	"github.com/ethereum/go-ethereum/common"
)

// Contract addresses - Sepolia testnet
const (
	DefaultUSDKAddress        = "0xAeE3625b0E6a4FfAc196d4DCB51dCe7568dD6353"
	DefaultProofRegistryAddress = "0x4699ED32Ab75A7B7f8c74eAE88EF1EB02BFa55da"
	DefaultRPCEndpoint        = "https://sepolia.infura.io/v3/5248acacf6244306b0cac215a002eb04"
)

// ContractConfig holds the configuration for blockchain contracts
type ContractConfig struct {
	USDKAddress        common.Address
	ProofRegistryAddress common.Address
	RPCEndpoint        string
}

// NewContractConfig creates a new contract configuration with default values or from environment
func NewContractConfig() *ContractConfig {
	config := &ContractConfig{
		USDKAddress:        common.HexToAddress(getEnvOrDefault("USDK_CONTRACT_ADDRESS", DefaultUSDKAddress)),
		ProofRegistryAddress: common.HexToAddress(getEnvOrDefault("PROOF_REGISTRY_ADDRESS", DefaultProofRegistryAddress)),
		RPCEndpoint:        getEnvOrDefault("ETH_RPC_URL", DefaultRPCEndpoint),
	}
	
	return config
}

// getEnvOrDefault returns the environment variable value or a default value if not set
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Batch types for ProofRegistry
const (
	BatchTypeReserves uint8 = iota
	BatchTypeTransactions
	BatchTypeLiabilities
)

// Role constants for contracts
var (
	// USDK roles
	MinterRole     = common.HexToHash("0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6")
	BurnerRole     = common.HexToHash("0x3c11d16cbaffd01df69ce1c404f6340ee057498f5f00246190ea54220576a848")
	PauserRole     = common.HexToHash("0x65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862a")
	BlacklisterRole = common.HexToHash("0x98db8a220cd0f09badce9f22d0ba7e93edb3d404448cc3560d391ab096ad16e9")
	
	// ProofRegistry roles
	DefaultAdminRole = common.HexToHash("0x0000000000000000000000000000000000000000000000000000000000000000")
	OracleRole      = common.HexToHash("0x68e79a7bf1e0bc45d0a330c573bc367f9cf464fd326078812f301165fbda4ef1") // keccak256("ORACLE_ROLE")
)