import React from 'react'
import { useSupportedChains, useChainAssets, getChainName, getChainIcon } from '../hooks/useSupportedChains'

const SupportedChainsExample: React.FC = () => {
  const {
    data: supportedChains,
    isLoading,
    error,
    refetch
  } = useSupportedChains()

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading supported chains...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error loading supported chains</h3>
        <p>{error.message}</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    )
  }

  if (!supportedChains) {
    return (
      <div className="no-data-container">
        <p>No supported chains data available</p>
      </div>
    )
  }

  return (
    <div className="supported-chains-container">
      <h2>Supported Chains & Assets</h2>
      <p>Total chains: {supportedChains.chains.length}</p>
      <p>Timestamp: {new Date(supportedChains.timestamp * 1000).toLocaleString()}</p>
      
      <div className="chains-grid">
        {supportedChains.chains.map((chain) => (
          <ChainCard key={chain.chainId} chain={chain} />
        ))}
      </div>
    </div>
  )
}

interface ChainCardProps {
  chain: {
    chain: string
    chainId: number
    assets: Array<{
      symbol: string
      decimals: number
      minDeposit: string
    }> | null
  }
}

const ChainCard: React.FC<ChainCardProps> = ({ chain }) => {
  const { assets, assetCount } = useChainAssets(chain.chainId)
  
  return (
    <div className="chain-card">
      <div className="chain-header">
        <span className="chain-icon">{getChainIcon(chain.chainId)}</span>
        <div className="chain-info">
          <h3>{getChainName(chain.chainId)}</h3>
          <p className="chain-id">Chain ID: {chain.chainId}</p>
          <p className="chain-name">{chain.chain}</p>
        </div>
      </div>
      
      <div className="chain-assets">
        {chain.assets ? (
          <>
            <div className="assets-header">
              <h4>Supported Assets ({assetCount})</h4>
            </div>
            <div className="assets-list">
              {chain.assets.map((asset) => (
                <AssetItem key={asset.symbol} asset={asset} />
              ))}
            </div>
          </>
        ) : (
          <div className="no-assets">
            <p>No assets configured for this chain</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface AssetItemProps {
  asset: {
    symbol: string
    decimals: number
    minDeposit: string
  }
}

const AssetItem: React.FC<AssetItemProps> = ({ asset }) => {
  return (
    <div className="asset-item">
      <div className="asset-symbol">{asset.symbol}</div>
      <div className="asset-details">
        <span className="asset-decimals">Decimals: {asset.decimals}</span>
        <span className="asset-min-deposit">Min: {asset.minDeposit}</span>
      </div>
    </div>
  )
}

// Example of using the hook in a different way
export const useChainAssetsExample: React.FC = () => {
  const { assets, isLoading, error } = useChainAssets(1) // Ethereum mainnet
  
  if (isLoading) return <div>Loading Ethereum assets...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return (
    <div>
      <h3>Ethereum Assets</h3>
      <ul>
        {assets.map((asset) => (
          <li key={asset.symbol}>
            {asset.symbol} - Min deposit: {asset.minDeposit}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SupportedChainsExample
