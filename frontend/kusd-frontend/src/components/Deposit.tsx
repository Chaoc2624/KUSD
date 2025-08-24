import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from 'qrcode.react';
import {
  Wallet,
  Copy,
  QrCode,
  Check,
  ArrowLeft,
  Download,
  ExternalLink,
  Send,
  AlertCircle,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { ethers } from "ethers";
import { api } from "../consts/Apis";
import contractAddress, {
  depositABI,
  erc20ABI,
  getContractAddresses,
  getNetworkName,
} from "../consts/ContractAddress";

interface TokenInfo {
  symbol: string;
  name: string;
  icon: string;
  address: string;
  decimals: number;
}

const Deposit: React.FC = () => {
  const navigate = useNavigate();

  const [selectedToken, setSelectedToken] = useState<string>("USDT");
  const [showQRCode, setShowQRCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [isCheckingWallet, setIsCheckingWallet] = useState(true);
  const [contractStatus, setContractStatus] = useState<{
    isValid: boolean;
    message: string;
    isLoading: boolean;
  }>({ isValid: false, message: "", isLoading: true });
  const [apiDepositAddress, setApiDepositAddress] = useState<string>("");
  const [isLoadingDepositAddress, setIsLoadingDepositAddress] = useState(false);
  const web3Context = useWeb3();
  // Mock supported tokens - in real app, this would come from backend
  const supportedTokens: TokenInfo[] = [
    {
      symbol: "USDT",
      name: "Tether USD",
      icon: "💵",
      address:
        contractAddress[web3Context.chainId as keyof typeof contractAddress]
          .usdt,
      decimals: 6,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      icon: "💵",
      address:
        contractAddress[web3Context.chainId as keyof typeof contractAddress]
          .usdc,
      decimals: 6,
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      icon: "🔷",
      address:
        contractAddress[web3Context.chainId as keyof typeof contractAddress]
          .reth,
      decimals: 18,
    },
    {
      symbol: "BTC",
      name: "Bitcoin",
      icon: "🟡",
      address:
        contractAddress[web3Context.chainId as keyof typeof contractAddress]
          .wbtc,
      decimals: 8,
    },
    {
      symbol: "AAVE",
      name: "Aave",
      icon: "🟣",
      address:
        contractAddress[web3Context.chainId as keyof typeof contractAddress]
          .aave,
      decimals: 18,
    },
  ];

  // Check wallet connection and redirect if not connected
  useEffect(() => {
    if (!web3Context.account) {
      // Add a small delay to show the loading state before redirecting
      setTimeout(() => {
        navigate('/wallet');
      }, 1500);
      return;
    }
    
    // Check if we have a valid chain ID
    if (!web3Context.chainId) {
      // If no chain ID, still redirect to wallet
      setTimeout(() => {
        navigate('/wallet');
      }, 1500);
      return;
    }
    
    setWalletAddress(web3Context.account);
    setIsConnected(true);
    setIsCheckingWallet(false);
  }, [web3Context.account, web3Context.chainId, navigate]);

  // Check contract status when wallet is connected
  useEffect(() => {
    const checkContractStatus = async () => {
      if (!web3Context.account || !web3Context.chainId) return;
      
      setContractStatus(prev => ({ ...prev, isLoading: true }));
      
      try {
        const isValid = await validateDepositContract();
        if (isValid) {
          setContractStatus({
            isValid: true,
            message: "Deposit address is ready",
            isLoading: false
          });
        } else {
          setContractStatus({
            isValid: false,
            message: "Deposit address validation failed",
            isLoading: false
          });
        }
      } catch (error: any) {
        setContractStatus({
          isValid: false,
          message: `Address error: ${error.message}`,
          isLoading: false
        });
      }
    };

    checkContractStatus();
  }, [web3Context.account, web3Context.chainId]);

  // Fetch deposit address from API when authenticated
  useEffect(() => {
    if (web3Context.chainId) {
      fetchDepositAddressFromAPI();
    }
  }, [web3Context.chainId, selectedToken]);

  // Also fetch when component mounts if already authenticated
  useEffect(() => {
    if (web3Context.chainId && selectedToken) {
      fetchDepositAddressFromAPI();
    }
  }, []); // Empty dependency array - only run once on mount

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  const generateDepositAddress = () => {
    // Use the deposit address from API or fallback to hardcoded address
    return getDepositAddress();
  };

  // Generate cryptocurrency URI for QR code
  const generateCryptoURI = () => {
    const address = getDepositAddress();
    const networkName = getNetworkName(web3Context.chainId || 1).toLowerCase();
    
    // Format based on token type
    if (selectedToken === "ETH") {
      // Ethereum URI format: ethereum:<address>
      return `ethereum:${address}`;
    } else {
      // ERC20 URI format: ethereum:<token-contract-address>/transfer?address=<recipient>&uint256=<amount>
      const tokenAddress = getTokenContractAddress(selectedToken);
      return `ethereum:${tokenAddress}/transfer?address=${address}${depositAmount ? `&uint256=${ethers.parseUnits(depositAmount, getTokenDecimals(selectedToken))}` : ''}`;
    }
  };

  // Get token decimals
  const getTokenDecimals = (symbol: string): number => {
    const token = supportedTokens.find(t => t.symbol === symbol);
    return token?.decimals || 18;
  };

  const getTokenContractAddress = (tokenSymbol: string) => {
    const chainId = web3Context.chainId || 1;
    const addresses = getContractAddresses(chainId);
    const tokenMap: { [key: string]: string } = {
      USDT: addresses.usdt,
      USDC: addresses.usdc,
      BTC: addresses.wbtc,
      AAVE: addresses.aave,
    };
    return tokenMap[tokenSymbol] || "";
  };

  const getDepositContractAddress = () => {
    const chainId = web3Context.chainId || 1;
    const addresses = getContractAddresses(chainId);
    return addresses.depositContract;
  };

  const fetchDepositAddressFromAPI = async () => {
    if (!web3Context.chainId) {
      console.log('Cannot fetch deposit address: chainId not set');
      return null;
    }

    try {
      setIsLoadingDepositAddress(true);
      // Convert chainId to chain key format
      const chainKey = getChainKey(web3Context.chainId);
      
      console.log('Fetching deposit address from API for:', selectedToken, 'on chain:', web3Context.chainId, 'using key:', chainKey);
      
      // Try to get deposit address for the selected token
      const response = await api.getDepositAddressPublic(
        {
          chain: chainKey,
          asset: selectedToken
        }
      );

      console.log('API response:', response);

      if (response.success && response.data) {
        console.log('Successfully got deposit address from API:', response.data.address);
        setApiDepositAddress(response.data.address);
        return response.data.address;
      } else {
        console.warn('Failed to get deposit address from API:', response.error);
        return null;
      }
    } catch (error) {
      console.error('Error fetching deposit address from API:', error);
      return null;
    } finally {
      setIsLoadingDepositAddress(false);
    }
  };

  // Helper function to convert chainId to chain key format
  const getChainKey = (chainId: number): string => {
    const chainMap: { [key: number]: string } = {
      1: 'ethereum',
      11155111: 'sepolia',
      42161: 'arbitrum',
      10: 'optimism',
      137: 'polygon',
      8453: 'base'
    };
    return chainMap[chainId] || 'ethereum'; // default to ethereum
  };

  const getDepositAddress = () => {
    // Priority: API address > hardcoded address
    if (apiDepositAddress) {
      return apiDepositAddress;
    }
    return getDepositContractAddress();
  };

  const validateDepositContract = async () => {
    try {
      const contractAddress = getDepositAddress();
      if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("Invalid deposit address");
      }

      // Just check if the address is valid (basic format check)
      if (!ethers.isAddress(contractAddress)) {
        throw new Error("Invalid deposit address format");
      }

      console.log(`Address validation successful: ${contractAddress} on network ${web3Context.chainId}`);
      return true;
    } catch (error: any) {
      console.error("Address validation error:", error);
      return false;
    }
  };

  const handleDeposit = async () => {
    if (!web3Context.signer || !web3Context.account) {
      setDepositError("Please connect your wallet first");
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setDepositError("Please enter a valid amount");
      return;
    }

    setIsDepositing(true);
    setDepositError("");
    setDepositSuccess(false);

    try {
      // Validate contract before attempting deposit
      const isContractValid = await validateDepositContract();
      if (!isContractValid) {
        throw new Error("Deposit contract validation failed. Please check your network connection.");
      }

      if (selectedToken === "ETH") {
        await handleETHDeposit();
      } else {
        await handleTokenDeposit();
      }
    } catch (error: any) {
      console.error("Deposit error:", error);
      setDepositError(error.message || "Deposit failed. Please try again.");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleETHDeposit = async () => {
    if (!web3Context.signer) return;

    try {
      const contractAddress = getDepositAddress();
      if (!contractAddress) {
        throw new Error("Invalid deposit address");
      }

      const amountWei = ethers.parseEther(depositAmount);
      console.log("Sending ETH deposit:", amountWei.toString(), "to address:", contractAddress);
      
      // Send ETH directly to the target address
      const tx = await web3Context.signer.sendTransaction({
        to: contractAddress,
        value: amountWei
      });

      console.log("ETH deposit transaction sent:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      if (receipt) {
        console.log("ETH deposit confirmed in block:", receipt.blockNumber);
      }
      
      setDepositSuccess(true);
      setDepositAmount("");
      setDepositError(""); // Clear any previous errors
      
    } catch (error: any) {
      console.error("ETH deposit error:", error);
      throw error;
    }
  };

  const handleTokenDeposit = async () => {
    if (!web3Context.signer || !web3Context.account) return;

    const tokenAddress = getTokenContractAddress(selectedToken);
    const depositContractAddress = getDepositAddress();

    if (!tokenAddress || !depositContractAddress) {
      throw new Error("Invalid addresses");
    }

    // Create token contract instance
    const tokenContract = new ethers.Contract(
      tokenAddress,
      erc20ABI,
      web3Context.signer
    );

    // Get token decimals
    const decimals = await tokenContract.decimals();
    const amountWei = ethers.parseUnits(depositAmount, decimals);

    // Check allowance first
    const allowance = await tokenContract.allowance(
      web3Context.account,
      depositContractAddress
    );

    if (allowance < amountWei) {
      // Approve first
      console.log("Approving token transfer...");
      const approveTx = await tokenContract.approve(
        depositContractAddress,
        amountWei
      );
      await approveTx.wait();
      console.log("Token approval confirmed");
    }

    // Send tokens directly to the target address
    console.log("Sending token deposit:", amountWei.toString(), "to address:", depositContractAddress);
    const tx = await tokenContract.transfer(
      depositContractAddress,
      amountWei
    );

    console.log("Token deposit transaction sent:", tx.hash);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    if (receipt) {
      console.log("Token deposit confirmed in block:", receipt.blockNumber);
    }
    
    setDepositSuccess(true);
    setDepositAmount("");
    setDepositError(""); // Clear any previous errors
  };

  const resetDepositState = () => {
    setDepositError("");
    setDepositSuccess(false);
    setDepositAmount("");
  };



  // Show loading state while checking wallet connection
  if (isCheckingWallet) {
    return (
      <section id="deposit" className="deposit section">
        <div className="container">
          <div className="deposit-header">
            <div className="header-content">
              <h2 className="section-title">
                Checking <span className="text-gradient">Wallet</span>
              </h2>
              <p className="section-description">
                Please wait while we verify your wallet connection...
              </p>
              <div className="loading-spinner">
                <div className="spinner"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="deposit" className="deposit section">
      <div className="container">
        <div className="deposit-header">
          <div className="header-content">
            <button
              className="back-btn"
              onClick={() => window.history.back()}
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
            <h2 className="section-title">
              Deposit <span className="text-gradient">Assets</span>
            </h2>
            <p className="section-description">
              Deposit supported assets to start earning with KUSD
            </p>
          </div>
        </div>

        <div className="deposit-grid">
          {/* Wallet Connection Status */}
          <div className="deposit-card wallet-status glow">
            <div className="card-header">
              <div className="card-title">
                <Wallet size={24} />
                <h3>Wallet Status</h3>
              </div>
              <div
                className={`status-indicator ${
                  isConnected ? "connected" : "disconnected"
                }`}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </div>
            </div>

            {isConnected && (
              <div className="wallet-info">
                <div className="address-display">
                  <span className="address-label">Connected Address:</span>
                  <div className="address-wrapper">
                    <span className="address-text">{walletAddress}</span>
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(walletAddress)}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Token Selection */}
          <div className="deposit-card token-selection glow">
            <div className="card-header">
              <div className="card-title">
                <h3>Select Asset to Deposit</h3>
              </div>
            </div>

            <div className="token-grid">
              {supportedTokens.map((token) => (
                <button
                  key={token.symbol}
                  className={`token-option ${
                    selectedToken === token.symbol ? "selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedToken(token.symbol);
                    resetDepositState();
                  }}
                >
                  <div className="token-icon">{token.icon}</div>
                  <div className="token-info">
                    <div className="token-symbol">{token.symbol}</div>
                    <div className="token-name">{token.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Deposit Amount Input */}
          <div className="deposit-card deposit-amount glow">
            <div className="card-header">
              <div className="card-title">
                <h3>Deposit Amount</h3>
              </div>
            </div>

            <div className="deposit-amount-content">
              <div className="amount-input-group">
                <label htmlFor="deposit-amount">Amount to deposit:</label>
                <div className="amount-input-wrapper">
                  <input
                    id="deposit-amount"
                    type="number"
                    placeholder="0.0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="amount-input"
                    min="0"
                    step="0.000001"
                  />
                  <span className="token-label">{selectedToken}</span>
                </div>
              </div>

              {/* Contract Status Indicator */}
              <div className={`contract-status ${contractStatus.isValid ? 'valid' : 'invalid'}`}>
                <div className="status-icon">
                  {contractStatus.isLoading ? (
                    <div className="spinner-small"></div>
                  ) : contractStatus.isValid ? (
                    <Check size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                </div>
                <span className="status-text">
                  {contractStatus.isLoading ? 'Checking address...' : contractStatus.message}
                </span>
              </div>

              {/* API Status Indicator */}
              {isLoadingDepositAddress && (
                <div className="api-status">
                  <div className="status-icon">
                    <div className="spinner-small"></div>
                  </div>
                  <span className="status-text">
                    Fetching API address...
                  </span>
                </div>
              )}
              {apiDepositAddress && (
                <div className="api-status">
                  <div className="status-icon">
                    <Check size={16} />
                  </div>
                  <span className="status-text">
                    API address loaded
                  </span>
                  <button 
                    className="refresh-btn"
                    onClick={() => fetchDepositAddressFromAPI()}
                    disabled={isLoadingDepositAddress}
                  >
                    🔄 Refresh
                  </button>
                </div>
              )}
              {!apiDepositAddress && (
                <div className="api-status">
                  <div className="status-icon">
                    <AlertCircle size={16} />
                  </div>
                  <span className="status-text">
                    API address not available
                  </span>
                  <button 
                    className="refresh-btn"
                    onClick={() => fetchDepositAddressFromAPI()}
                    disabled={isLoadingDepositAddress}
                  >
                    🔄 Refresh
                  </button>
                </div>
              )}

              {/* Debug Info (remove in production) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="debug-info">
                  <details>
                    <summary>Debug Info</summary>
                    <div className="debug-content">
                      <p><strong>Chain ID:</strong> {web3Context.chainId || 'Not set'}</p>
                      <p><strong>Chain Key:</strong> {web3Context.chainId ? getChainKey(web3Context.chainId) : 'Not set'}</p>
                      <p><strong>Selected Token:</strong> {selectedToken}</p>
                      <p><strong>API Address:</strong> {apiDepositAddress || 'Not fetched'}</p>
                      <p><strong>Fallback Address:</strong> {getDepositContractAddress()}</p>
                      <p><strong>Final Address:</strong> {getDepositAddress()}</p>
                    </div>
                  </details>
                </div>
              )}

              {/* Info message when contract is ready */}
              {contractStatus.isValid && !contractStatus.isLoading && (
                <div className="info-message">
                  <Check size={16} />
                  <div className="info-content">
                    <strong>Address Ready</strong>
                    <p>✅ ETH and token deposits will work immediately</p>
                    <p>📤 Sending to address: <code>{getDepositAddress()}</code></p>
                    {apiDepositAddress ? (
                      <p>🔄 Using API address</p>
                    ) : (
                      <p>📋 Using fallback address</p>
                    )}
                    <p><small>Your assets will be sent to this address. Make sure it's correct!</small></p>
                  </div>
                </div>
              )}

              {/* Help message when contract is not ready */}
              {!contractStatus.isValid && !contractStatus.isLoading && (
                <div className="help-message">
                  <AlertCircle size={16} />
                  <div className="help-content">
                    <strong>Address Not Ready</strong>
                    <p>The deposit address needs to be configured. To fix this:</p>
                    <ol>
                      <li>Connect your wallet to get the network information</li>
                      <li>The API will provide the correct deposit address</li>
                      <li>If API fails, update the fallback address in <code>src/consts/ContractAddress.tsx</code></li>
                    </ol>
                    <p><strong>Note:</strong> The system now prioritizes API addresses over hardcoded ones for better security and flexibility.</p>
                  </div>
                </div>
              )}

              {depositError && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  <span>{depositError}</span>
                </div>
              )}

              {depositSuccess && (
                <div className="success-message">
                  <Check size={16} />
                  <span>Deposit successful! Transaction confirmed.</span>
                  <small>Your {selectedToken} has been sent to the deposit address.</small>
                </div>
              )}

              <button
                className="deposit-btn"
                onClick={handleDeposit}
                disabled={
                  isDepositing ||
                  !depositAmount ||
                  parseFloat(depositAmount) <= 0 ||
                  !contractStatus.isValid
                }
              >
                <Send size={20} />
                {isDepositing ? "Processing..." : 
                 !contractStatus.isValid ? "Contract Not Ready" : 
                 `Deposit ${selectedToken}`}
              </button>
            </div>
          </div>

          {/* Deposit Address */}
          <div className="deposit-card deposit-address glow">
            <div className="card-header">
              <div className="card-title">
                <h3>Deposit Address</h3>
              </div>
              <button
                className="qr-toggle-btn"
                onClick={() => setShowQRCode(!showQRCode)}
              >
                <QrCode size={20} />
                {showQRCode ? "Hide QR" : "Show QR"}
              </button>
            </div>

            <div className="deposit-content">
                              {showQRCode ? (
                  <div className="qr-section">
                    <div className="qr-code-container">
                      <QRCodeSVG
                        value={generateCryptoURI()}
                        size={200}
                        level="H"
                        includeMargin={true}
                        imageSettings={{
                          src: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${getTokenContractAddress(selectedToken)}/logo.png`,
                          x: undefined,
                          y: undefined,
                          height: 40,
                          width: 40,
                          excavate: true,
                        }}
                      />
                      <p>Scan with your crypto wallet</p>
                      <small>
                        {selectedToken === "ETH" ? 
                          "Send ETH to this address" : 
                          `Send ${selectedToken} using contract ${getTokenContractAddress(selectedToken)}`
                        }
                      </small>
                      <div className="qr-network">
                        <span className="network-badge">
                          {getNetworkName(web3Context.chainId || 1)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="download-qr-btn"
                      onClick={() => {
                        const svg = document.querySelector('.qr-code-container svg');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          img.onload = () => {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx?.drawImage(img, 0, 0);
                            const pngFile = canvas.toDataURL('image/png');
                            const downloadLink = document.createElement('a');
                            downloadLink.download = `${selectedToken}_deposit_qr.png`;
                            downloadLink.href = pngFile;
                            downloadLink.click();
                          };
                          img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
                        }
                      }}
                    >
                      <Download size={16} />
                      Download QR Code
                    </button>
                  </div>
                ) : (
                <div className="address-section">
                  <div className="selected-token-info">
                    <span className="token-icon-large">
                      {
                        supportedTokens.find((t) => t.symbol === selectedToken)
                          ?.icon
                      }
                    </span>
                    <span className="token-symbol-large">{selectedToken}</span>
                  </div>
                  
                  <div className="network-contract-info">
                    <div className="network-selector">
                      <span className="network-label">Network:</span>
                      <select 
                        value={web3Context.chainId || 1}
                        onChange={(e) => web3Context.switchNetwork(Number(e.target.value))}
                        className="network-select"
                      >
                        <option value={1}>Ethereum Mainnet</option>
                        <option value={137}>Polygon Mainnet</option>
                        <option value={42161}>Arbitrum One</option>
                        <option value={10}>Optimism</option>
                        <option value={11155111}>Sepolia Testnet</option>
                      </select>
                    </div>
                    <span className="contract-type">Deposit Address</span>
                  </div>

                  <div className="deposit-address-display">
                    <span className="address-label">Deposit Address:</span>
                    <div className="address-wrapper large">
                      <span className="address-text">
                        {generateDepositAddress()}
                      </span>
                      <button
                        className="copy-btn large"
                        onClick={() =>
                          copyToClipboard(generateDepositAddress())
                        }
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="deposit-instructions">
                    <h4>How to deposit:</h4>
                    <ol>
                      <li>Copy the deposit address above</li>
                      <li>
                        Send {selectedToken} from your wallet to this address
                      </li>
                      <li>
                        Wait for network confirmations (usually 1-3 blocks)
                      </li>
                      <li>Your deposit will be sent to the specified address</li>
                    </ol>
                    <div className="contract-info">
                      <small>
                        <strong>Note:</strong> This is the deposit address for {getNetworkName(web3Context.chainId || 1)}. 
                        Simply send your tokens to this address to complete your deposit.
                      </small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Network Information */}
          <div className="deposit-card network-info glow">
            <div className="card-header">
              <div className="card-title">
                <h3>Network Information</h3>
              </div>
            </div>

            <div className="network-details">
              <div className="network-item">
                <span className="label">Network:</span>
                <span className="value">
                  {getNetworkName(web3Context.chainId || 1)}
                </span>
              </div>
              <div className="network-item">
                <span className="label">Block Time:</span>
                <span className="value">~12 seconds</span>
              </div>
              <div className="network-item">
                <span className="label">Confirmations:</span>
                <span className="value">3 blocks</span>
              </div>
              <div className="network-item">
                <span className="label">Gas Fees:</span>
                <span className="value">Dynamic</span>
              </div>
            </div>

            <div className="network-links">
              <a
                href={
                  web3Context.chainId === 11155111
                    ? "https://sepolia.etherscan.io"
                    : web3Context.chainId === 42161
                    ? "https://arbiscan.io"
                    : web3Context.chainId === 10
                    ? "https://optimistic.etherscan.io"
                    : "https://etherscan.io"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="network-link"
              >
                <ExternalLink size={16} />
                View on{" "}
                {web3Context.chainId === 11155111
                  ? "Sepolia Etherscan"
                  : web3Context.chainId === 42161
                  ? "Arbiscan"
                  : web3Context.chainId === 10
                  ? "Optimistic Etherscan"
                  : "Etherscan"}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};  

export default Deposit;
