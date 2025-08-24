import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Wallet as WalletIcon, LogOut, Shield, CheckCircle, XCircle, RefreshCw, Copy, ExternalLink } from 'lucide-react'
import { useWeb3 } from '../context/Web3Context'

const Wallet: React.FC = () => {
  const { isConnected, account, signer, connectWallet, disconnectWallet, chainId, balance } = useWeb3()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleConnectWallet = async () => {
    try {
      setError(null)
      setSuccess(null)
      setIsConnecting(true)
      
      await connectWallet()
      setSuccess('Wallet connected successfully!')
      
    } catch (error: any) {
      console.error('Wallet connection error:', error)
      setError(error.message || 'Failed to connect wallet')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnectWallet = async () => {
    try {
      setError(null)
      setSuccess(null)
      await disconnectWallet()
      setSuccess('Wallet disconnected successfully!')
    } catch (error: any) {
      console.error('Wallet disconnection error:', error)
      setError(error.message || 'Failed to disconnect wallet')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getNetworkName = (chainId: number | null): string => {
    if (!chainId) return 'Unknown'
    const networks: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet',
      42161: 'Arbitrum One',
      10: 'Optimism',
      137: 'Polygon',
      8453: 'Base'
    }
    return networks[chainId] || `Chain ID: ${chainId}`
  }

  const getEtherscanUrl = (chainId: number | null, address: string): string => {
    if (!chainId || !address) return '#'
    const explorers: { [key: number]: string } = {
      1: 'https://etherscan.io',
      11155111: 'https://sepolia.etherscan.io',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
      137: 'https://polygonscan.com',
      8453: 'https://basescan.org'
    }
    const baseUrl = explorers[chainId] || 'https://etherscan.io'
    return `${baseUrl}/address/${address}`
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as const }
    }
  }

  return (
    <div className="login-container">
      <div className="container">
        <motion.div 
          className="login-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="login-header">
            <WalletIcon size={32} className="login-icon" />
            <h2>Wallet Connection</h2>
            <p>Connect your Ethereum wallet to interact with KUSD Platform</p>
          </div>

          {/* Connection Status */}
          <div className="status-section">
            <div className="status-item">
              <span className="status-label">Wallet Status:</span>
              <span className={`status-value ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? (
                  <>
                    <CheckCircle size={16} />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Disconnected
                  </>
                )}
              </span>
            </div>
            
            {isConnected && (
              <>
                <div className="status-item">
                  <span className="status-label">Address:</span>
                  <span className="status-value address">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                    <button 
                      className="copy-btn"
                      onClick={() => copyToClipboard(account || '')}
                      title="Copy address"
                    >
                      <Copy size={14} />
                    </button>
                  </span>
                </div>
                
                <div className="status-item">
                  <span className="status-label">Network:</span>
                  <span className="status-value">
                    {getNetworkName(chainId)}
                  </span>
                </div>
                
                <div className="status-item">
                  <span className="status-label">Balance:</span>
                  <span className="status-value">
                    {balance} ETH
                  </span>
                </div>
                
                <div className="status-item">
                  <span className="status-label">Signer:</span>
                  <span className={`status-value ${signer ? 'connected' : 'disconnected'}`}>
                    {signer ? (
                      <>
                        <CheckCircle size={16} />
                        Available
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
                        Not Available
                      </>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            {!isConnected ? (
              <motion.button
                className="action-btn primary glow"
                onClick={handleConnectWallet}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isConnecting}
              >
                <WalletIcon size={20} />
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </motion.button>
            ) : (
              <div className="button-group">
                <motion.button
                  className="action-btn secondary glow"
                  onClick={handleDisconnectWallet}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <LogOut size={20} />
                  Disconnect Wallet
                </motion.button>
                
                {account && (
                  <motion.button
                    className="action-btn secondary glow"
                    onClick={() => window.open(getEtherscanUrl(chainId, account), '_blank')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ExternalLink size={20} />
                    View on Explorer
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <motion.div 
              className="message error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <XCircle size={16} />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div 
              className="message success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <CheckCircle size={16} />
              {success}
            </motion.div>
          )}

          {copied && (
            <motion.div 
              className="message success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Copy size={16} />
              Address copied to clipboard!
            </motion.div>
          )}

          {/* Info Section */}
          <div className="info-section">
            <h3>What you can do:</h3>
            <ul>
              <li>Connect your Ethereum wallet (MetaMask, WalletConnect, etc.)</li>
              <li>View your wallet address and balance</li>
              <li>Check your current network</li>
              <li>Access deposit and trading features</li>
              <li>View transactions on blockchain explorers</li>
            </ul>
            
            <div className="security-note">
              <Shield size={16} />
              <span>Your private keys never leave your wallet. Only public information is displayed.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Wallet
