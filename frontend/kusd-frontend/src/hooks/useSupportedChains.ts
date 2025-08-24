import { useQuery } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { api } from '../consts/Apis'
import type { SupportedChainsResponse, ApiResponse } from '../consts/Apis'

// Query key for supported chains
export const SUPPORTED_CHAINS_QUERY_KEY = ['supported-chains']

// Fetch function for supported chains
const fetchSupportedChains = async (): Promise<SupportedChainsResponse> => {
  const response = await api.getSupportedChains()
  
  if (!response.success || !response.data) {
    throw new Error(response.error || 'Failed to fetch supported chains')
  }
  
  return response.data
}

// Custom hook for supported chains
export const useSupportedChains = (
  options?: Omit<UseQueryOptions<SupportedChainsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: SUPPORTED_CHAINS_QUERY_KEY,
    queryFn: fetchSupportedChains,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  })
}

// Hook for getting chains with assets only
export const useSupportedChainsWithAssets = (
  options?: Omit<UseQueryOptions<SupportedChainsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  const query = useSupportedChains(options)
  
  // Filter chains that have assets
  const chainsWithAssets = query.data?.chains.filter(chain => chain.assets !== null) || []
  
  return {
    ...query,
    chainsWithAssets,
    hasChainsWithAssets: chainsWithAssets.length > 0,
  }
}

// Hook for getting a specific chain by ID
export const useChainById = (
  chainId: number,
  options?: Omit<UseQueryOptions<SupportedChainsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  const query = useSupportedChains(options)
  
  const chain = query.data?.chains.find(c => c.chainId === chainId)
  
  return {
    ...query,
    chain,
    hasChain: !!chain,
    hasAssets: chain?.assets !== null,
  }
}

// Hook for getting assets for a specific chain
export const useChainAssets = (
  chainId: number,
  options?: Omit<UseQueryOptions<SupportedChainsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  const chainQuery = useChainById(chainId, options)
  
  return {
    ...chainQuery,
    assets: chainQuery.chain?.assets || [],
    assetCount: chainQuery.chain?.assets?.length || 0,
    hasAssets: chainQuery.hasAssets,
  }
}

// Hook for getting a specific asset from a chain
export const useChainAsset = (
  chainId: number,
  symbol: string,
  options?: Omit<UseQueryOptions<SupportedChainsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  const assetsQuery = useChainAssets(chainId, options)
  
  const asset = assetsQuery.assets.find(a => a.symbol === symbol)
  
  return {
    ...assetsQuery,
    asset,
    hasAsset: !!asset,
  }
}

// Utility functions for working with supported chains data
export const getChainName = (chainId: number): string => {
  const chainNames: { [key: number]: string } = {
    1: 'Ethereum',
    42161: 'Arbitrum',
    10: 'Optimism',
    137: 'Polygon',
    8453: 'Base',
    11155111: 'Sepolia',
  }
  return chainNames[chainId] || `Chain ${chainId}`
}

export const getChainIcon = (chainId: number): string => {
  const chainIcons: { [key: number]: string } = {
    1: '🔷',
    42161: '🔵',
    10: '🟠',
    137: '🟣',
    8453: '🔵',
    11155111: '🧪',
  }
  return chainIcons[chainId] || '🔗'
}

export const isTestnet = (chainId: number): boolean => {
  return chainId === 11155111 // Sepolia
}

export const getMinDeposit = (chainId: number, symbol: string): string | null => {
  // This would need to be used with the actual data from the hook
  // For now, return null as placeholder
  return null
}

// Hook for getting all available assets across all chains
export const useAllAssets = (
  options?: Omit<UseQueryOptions<SupportedChainsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  const query = useSupportedChains(options)
  
  const allAssets = query.data?.chains
    .filter(chain => chain.assets !== null)
    .flatMap(chain => 
      chain.assets!.map(asset => ({
        ...asset,
        chainId: chain.chainId,
        chainName: getChainName(chain.chainId),
        chainIcon: getChainIcon(chain.chainId),
        isTestnet: isTestnet(chain.chainId),
      }))
    ) || []
  
  // Remove duplicates based on symbol and chainId
  const uniqueAssets = allAssets.filter((asset, index, self) => 
    index === self.findIndex(a => a.symbol === asset.symbol && a.chainId === asset.chainId)
  )
  
  return {
    ...query,
    allAssets: uniqueAssets,
    assetCount: uniqueAssets.length,
    hasAssets: uniqueAssets.length > 0,
  }
}

// Hook for getting assets by symbol across all chains
export const useAssetsBySymbol = (
  symbol: string,
  options?: Omit<UseQueryOptions<SupportedChainsResponse, Error>, 'queryKey' | 'queryFn'>
) => {
  const allAssetsQuery = useAllAssets(options)
  
  const assetsBySymbol = allAssetsQuery.allAssets.filter(asset => asset.symbol === symbol)
  
  return {
    ...allAssetsQuery,
    assetsBySymbol,
    assetCount: assetsBySymbol.length,
    hasAssets: assetsBySymbol.length > 0,
  }
}

export default useSupportedChains
