import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Menu, X, Wallet } from 'lucide-react'

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <motion.header
      className={`header ${isScrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="container">
        <div className="header-content">
          {/* Logo */}
          <motion.div
            className="logo"
            whileHover={{ scale: 1.05 }}
            onClick={() => scrollToSection('hero')}
          >
            <span className="logo-text text-gradient">KUSD</span>
            <span className="logo-subtitle">Protocol</span>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="nav-desktop">
            <ul className="nav-list">
              <li><button onClick={() => scrollToSection('hero')} className="nav-link">Home</button></li>
              <li><button onClick={() => scrollToSection('dashboard')} className="nav-link">Dashboard</button></li>
              <li><button onClick={() => scrollToSection('features')} className="nav-link">Features</button></li>
              <li><button onClick={() => scrollToSection('contact')} className="nav-link">Contact</button></li>
            </ul>
          </nav>

          {/* Connect Wallet Button */}
          <motion.button
            className="connect-wallet-btn glow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Wallet size={20} />
            <span>Connect Wallet</span>
          </motion.button>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <motion.nav
          className={`nav-mobile ${isMobileMenuOpen ? 'open' : ''}`}
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: isMobileMenuOpen ? 'auto' : 0,
            opacity: isMobileMenuOpen ? 1 : 0
          }}
          transition={{ duration: 0.3 }}
        >
          <ul className="nav-list-mobile">
            <li><button onClick={() => scrollToSection('hero')} className="nav-link-mobile">Home</button></li>
            <li><button onClick={() => scrollToSection('dashboard')} className="nav-link-mobile">Dashboard</button></li>
            <li><button onClick={() => scrollToSection('features')} className="nav-link-mobile">Features</button></li>
            <li><button onClick={() => scrollToSection('contact')} className="nav-link-mobile">Contact</button></li>
          </ul>
        </motion.nav>
      </div>

      <style jsx>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 1rem 0;
          transition: all var(--transition-smooth);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid transparent;
        }

        .header.scrolled {
          background: rgba(26, 26, 46, 0.95);
          border-bottom: 1px solid var(--card-border);
          box-shadow: var(--shadow-card);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          flex-direction: column;
          cursor: pointer;
          user-select: none;
        }

        .logo-text {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .logo-subtitle {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: -0.2rem;
        }

        .nav-desktop {
          display: none;
        }

        .nav-list {
          display: flex;
          list-style: none;
          gap: 2rem;
        }

        .nav-link {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: color var(--transition-fast);
          position: relative;
        }

        .nav-link:hover {
          color: var(--text-accent);
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: 0;
          width: 0;
          height: 2px;
          background: var(--accent-gradient);
          transition: width var(--transition-fast);
        }

        .nav-link:hover::after {
          width: 100%;
        }

        .connect-wallet-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--accent-gradient);
          border: none;
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-smooth);
        }

        .connect-wallet-btn:hover {
          transform: translateY(-1px);
        }

        .mobile-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: var(--text-primary);
          cursor: pointer;
          padding: 0.5rem;
        }

        .nav-mobile {
          overflow: hidden;
          background: var(--card-bg);
          border-radius: 12px;
          margin-top: 1rem;
          border: 1px solid var(--card-border);
        }

        .nav-mobile.open {
          box-shadow: var(--shadow-card);
        }

        .nav-list-mobile {
          list-style: none;
          padding: 1rem 0;
        }

        .nav-link-mobile {
          display: block;
          width: 100%;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          padding: 1rem 1.5rem;
          text-align: left;
          transition: all var(--transition-fast);
        }

        .nav-link-mobile:hover {
          color: var(--text-accent);
          background: rgba(79, 172, 254, 0.1);
        }

        @media (min-width: 768px) {
          .nav-desktop {
            display: block;
          }

          .mobile-menu-btn {
            display: none;
          }

          .nav-mobile {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .logo-text {
            font-size: 1.5rem;
          }

          .connect-wallet-btn span {
            display: none;
          }

          .connect-wallet-btn {
            padding: 0.75rem;
          }
        }
      `}</style>
    </motion.header>
  )
}

export default Header