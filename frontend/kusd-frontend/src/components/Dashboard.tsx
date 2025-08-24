import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Activity,
  DollarSign,
  BarChart3,
  Plus,
  ArrowUpRight,
  RefreshCw,
  PieChart,
  ArrowRight,
  ExternalLink,
  Zap,
  ArrowDownRight,
  CreditCard,
} from "lucide-react";
import { useWeb3 } from "../context/Web3Context";
import { api } from "../consts/Apis";
import type { PortfolioOverviewResponse } from "../consts/Apis";

const Dashboard: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  const navigate = useNavigate();
  const web3Context = useWeb3();
  
  // Portfolio state
  const [portfolioData, setPortfolioData] = useState<PortfolioOverviewResponse | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  // Fetch portfolio data
  const fetchPortfolioData = async () => {
    try {
      setIsLoadingPortfolio(true);
      setPortfolioError(null);
      
      const response = await api.getPortfolioOverviewPublic();
      
      if (response.success && response.data) {
        setPortfolioData(response.data);
        console.log('Portfolio data loaded:', response.data);
      } else {
        setPortfolioError(response.error || 'Failed to load portfolio data');
        console.warn('Portfolio API error:', response.error);
      }
    } catch (error: any) {
      setPortfolioError(error.message || 'Failed to fetch portfolio data');
      console.error('Portfolio fetch error:', error);
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  // Load portfolio data on mount
  useEffect(() => {
    fetchPortfolioData();
  }, []);

  // Refresh portfolio data
  const handleRefreshPortfolio = () => {
    fetchPortfolioData();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut" as const
      }
    }
  }

  return (
    <section id="dashboard" className="dashboard section">
      <div className="container">
        <motion.div
          ref={ref}
          className="dashboard-header"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="section-title">
            KUSD <span className="text-gradient">Dashboard</span>
          </h2>
          <p className="section-description">
            Monitor your positions, manage collateral, and optimize yields in real-time
          </p>
        </motion.div>

        <motion.div
          className="dashboard-grid"
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {/* Portfolio Overview */}
          <motion.div variants={cardVariants} className="dashboard-card portfolio-card glow">
            <div className="card-header">
              <div className="card-title">
                <PieChart size={24} />
                <h3>Portfolio Overview</h3>
              </div>
              <motion.button
                className="refresh-btn"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.5 }}
                onClick={handleRefreshPortfolio}
                disabled={isLoadingPortfolio}
              >
                <RefreshCw size={16} className={isLoadingPortfolio ? 'animate-spin' : ''} />
              </motion.button>
            </div>

            {isLoadingPortfolio ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading portfolio data...</p>
              </div>
            ) : portfolioError ? (
              <div className="error-state">
                <p>Error: {portfolioError}</p>
                <button onClick={handleRefreshPortfolio} className="retry-btn">
                  Retry
                </button>
              </div>
            ) : portfolioData ? (
              <div className="portfolio-stats">
                <div className="stat-large">
                  <div className="stat-value">${portfolioData.totalKusd}</div>
                  <div className="stat-label">Total KUSD Balance</div>
                  <div className="stat-change positive">
                    <ArrowUpRight size={16} />
                    {(portfolioData.apy * 100).toFixed(2)}% APY
                  </div>
                </div>

                <div className="portfolio-breakdown">
                  <div className="breakdown-item">
                    <div className="breakdown-color bg-gradient-1"></div>
                    <span>Total Value Locked</span>
                    <span className="breakdown-value">${portfolioData.tvlKusd}</span>
                  </div>
                  <div className="breakdown-item">
                    <div className="breakdown-color bg-gradient-2"></div>
                    <span>Assets</span>
                    <span className="breakdown-value">{portfolioData.byAsset.length}</span>
                  </div>
                </div>

                {/* Asset Breakdown */}
                {portfolioData.byAsset.length > 0 && (
                  <div className="assets-breakdown">
                    <h4>Asset Breakdown</h4>
                    <div className="assets-list">
                      {portfolioData.byAsset.map((asset, index) => (
                        <div key={index} className="asset-item">
                          <div className="asset-info">
                            <span className="asset-symbol">{asset.asset}</span>
                            <span className="asset-chain">{asset.chain}</span>
                          </div>
                          <div className="asset-amounts">
                            <span className="asset-amount">{asset.amount} {asset.asset}</span>
                            <span className={`asset-kusd ${parseFloat(asset.kusd) >= 0 ? 'positive' : 'negative'}`}>
                              {parseFloat(asset.kusd) >= 0 ? '+' : ''}{asset.kusd} KUSD
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-data-state">
                <p>No portfolio data available</p>
              </div>
            )}
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={cardVariants} className="dashboard-card stats-grid">
            <div className="quick-stat glow">
              <div className="stat-icon">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{portfolioData?.apy || '--'}</div>
                <div className="stat-label">Current APY</div>
              </div>
            </div>

            <div className="quick-stat glow">
              <div className="stat-icon">
                <Activity size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{portfolioData?.collateralRatio || '--'}</div>
                <div className="stat-label">Collateral Ratio</div>
              </div>
            </div>

            <div className="quick-stat glow">
              <div className="stat-icon">
                <DollarSign size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{portfolioData?.tvl || '--'}</div>
                <div className="stat-label">TVL</div>
              </div>
            </div>

            <div className="quick-stat glow">
              <div className="stat-icon">
                <BarChart3 size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{portfolioData?.dailyVolume || '--'}</div>
                <div className="stat-label">Daily Volume</div>
              </div>
            </div>
          </motion.div>

          {/* Deposit Interface */}
          <motion.div variants={cardVariants} className="dashboard-card deposit-card glow">
            <div className="card-header">
              <div className="card-title">
                <Plus size={24} />
                <h3>Deposit Assets</h3>
              </div>
            </div>

            <div className="deposit-content">
              <div className="deposit-info">
                <h4>Start earning with KUSD</h4>
                <p>Deposit supported assets to begin your DeFi journey</p>
                
                <div className="supported-tokens">
                  <span className="token-badge">USDT</span>
                  <span className="token-badge">USDC</span>
                  <span className="token-badge">ETH</span>
                  <span className="token-badge">BTC</span>
                  <span className="token-badge">AAVE</span>
                </div>
              </div>

              <motion.button
                className="action-btn primary glow-intense"
                onClick={() => navigate('/deposit')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={20} />
                Deposit Assets
              </motion.button>
            </div>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div variants={cardVariants} className="dashboard-card transactions-card glow">
            <div className="card-header">
              <div className="card-title">
                <Activity size={24} />
                <h3>Recent Transactions</h3>
              </div>
              <button className="view-all-btn">View All</button>
            </div>

            <div className="transactions-list">
              <div className="transaction-item">
                <div className="transaction-icon mint">
                  <Zap size={16} />
                </div>
                <div className="transaction-details">
                  <div className="transaction-type">Mint KUSD</div>
                  <div className="transaction-time">2 hours ago</div>
                </div>
                <div className="transaction-amount">
                  <div className="amount positive">+1,250 KUSD</div>
                  <div className="usd-value">$1,250.00</div>
                </div>
              </div>

              <div className="transaction-item">
                <div className="transaction-icon deposit">
                  <ArrowDownRight size={16} />
                </div>
                <div className="transaction-details">
                  <div className="transaction-type">Deposit Collateral</div>
                  <div className="transaction-time">5 hours ago</div>
                </div>
                <div className="transaction-amount">
                  <div className="amount">0.75 ETH</div>
                  <div className="usd-value">$1,875.00</div>
                </div>
              </div>

              <div className="transaction-item">
                <div className="transaction-icon redeem">
                  <CreditCard size={16} />
                </div>
                <div className="transaction-details">
                  <div className="transaction-type">Redeem KUSD</div>
                  <div className="transaction-time">1 day ago</div>
                </div>
                <div className="transaction-amount">
                  <div className="amount negative">-500 KUSD</div>
                  <div className="usd-value">$500.00</div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <style jsx>{`
        .dashboard {
          background: rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
        }

        .dashboard-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .section-title {
          font-size: 3rem;
          font-weight: 800;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        .section-description {
          font-size: 1.25rem;
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .dashboard-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 24px;
          padding: 2rem;
          backdrop-filter: blur(20px);
          transition: all var(--transition-smooth);
          position: relative;
          overflow: hidden;
        }

        .dashboard-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: var(--accent-gradient);
          opacity: 0;
          transition: opacity var(--transition-smooth);
        }

        .dashboard-card:hover {
          background: var(--card-hover-bg);
          border-color: var(--card-hover-border);
          transform: translateY(-4px);
        }

        .dashboard-card:hover::before {
          opacity: 1;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: var(--text-primary);
          font-weight: 700;
          font-size: 1.25rem;
        }

        .refresh-btn,
        .view-all-btn {
          background: none;
          border: none;
          color: var(--text-accent);
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 8px;
          transition: all var(--transition-fast);
        }

        .refresh-btn:hover,
        .view-all-btn:hover {
          background: rgba(79, 172, 254, 0.1);
        }

        .portfolio-card {
          grid-column: 1 / -1;
        }

        .portfolio-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          align-items: center;
        }

        .stat-large .stat-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .stat-large .stat-label {
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }

        .stat-change {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .stat-change.positive {
          color: var(--success);
        }

        .stat-change.negative {
          color: var(--danger);
        }

        .portfolio-breakdown {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .breakdown-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(79, 172, 254, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(79, 172, 254, 0.1);
        }

        .breakdown-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .bg-gradient-1 {
          background: var(--accent-primary);
        }

        .bg-gradient-2 {
          background: var(--accent-secondary);
        }

        .breakdown-value {
          margin-left: auto;
          font-weight: 600;
          color: var(--text-primary);
        }

        .assets-breakdown h4 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 1rem;
        }

        .assets-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .asset-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: rgba(79, 172, 254, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(79, 172, 254, 0.1);
        }

        .asset-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .asset-symbol {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .asset-chain {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .asset-amounts {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }

        .asset-amount {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .asset-kusd {
          font-weight: 600;
          font-size: 1rem;
        }

        .asset-kusd.positive {
          color: var(--success);
        }

        .asset-kusd.negative {
          color: var(--danger);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          padding: 1rem;
        }

        .quick-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          transition: all var(--transition-smooth);
        }

        .quick-stat:hover {
          background: var(--card-hover-bg);
          border-color: var(--card-hover-border);
          transform: scale(1.02);
        }

        .stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: var(--accent-gradient);
          color: white;
        }

        .stat-content {
          text-align: center;
        }

        .quick-stat .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .quick-stat .stat-label {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .deposit-card {
          grid-column: 1 / -1;
        }

        .deposit-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          padding: 2rem 0;
          text-align: center;
        }

        .deposit-info h4 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .deposit-info p {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
        }

        .supported-tokens {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .token-badge {
          background: rgba(79, 172, 254, 0.1);
          color: var(--accent-primary);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          border: 1px solid rgba(79, 172, 254, 0.2);
        }



        .action-btn {
          width: 100%;
          border: none;
          padding: 1rem 2rem;
          border-radius: 16px;
          font-size: 1.1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-smooth);
        }

        .action-btn.primary {
          background: var(--accent-gradient);
          color: white;
        }

        .action-btn.secondary {
          background: transparent;
          border: 2px solid var(--accent-primary);
          color: var(--accent-primary);
        }

        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .transaction-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: rgba(79, 172, 254, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(79, 172, 254, 0.1);
          transition: all var(--transition-fast);
        }

        .transaction-item:hover {
          background: rgba(79, 172, 254, 0.1);
          border-color: rgba(79, 172, 254, 0.2);
        }

        .transaction-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 10px;
          color: white;
        }

        .transaction-icon.mint {
          background: var(--success);
        }

        .transaction-icon.deposit {
          background: var(--accent-primary);
        }

        .transaction-icon.redeem {
          background: var(--warning);
        }

        .transaction-details {
          flex: 1;
        }

        .transaction-type {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .transaction-time {
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .transaction-amount {
          text-align: right;
        }

        .amount {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .amount.positive {
          color: var(--success);
        }

        .amount.negative {
          color: var(--danger);
        }

        .usd-value {
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .loading-state,
        .error-state,
        .no-data-state {
          text-align: center;
          padding: 2rem;
          color: var(--text-secondary);
        }

        .loading-state .spinner {
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid var(--accent-primary);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        .retry-btn {
          background: var(--accent-primary);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all var(--transition-smooth);
        }

        .retry-btn:hover {
          background: var(--accent-primary-dark);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .section-title {
            font-size: 2.5rem;
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .portfolio-stats {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .tab-selector {
            flex-direction: column;
          }

          .tab-btn {
            justify-content: center;
          }
        }
      `}</style>
    </section>
  )
}

export default Dashboard