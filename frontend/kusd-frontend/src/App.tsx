import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'
import Header from './components/Header'
import Hero from './components/Hero'
import Dashboard from './components/Dashboard'
import Deposit from './components/Deposit'
import Features from './components/Features'
import Footer from './components/Footer'
import ParallaxBackground from './components/ParallaxBackground'
import SupportedChainsExample from './components/SupportedChainsExample'
import Wallet from './components/Wallet'
import { Web3Provider } from './context/Web3Context'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Web3Provider>
          <Router>
            <div className="app">
              <ParallaxBackground />
              <Header />
              <main>
                <Routes>
                  <Route path="/" element={
                    <>
                      <Hero />
                      <Dashboard />
                      <Features />
                    </>
                  } />
                  <Route path="/deposit" element={<Deposit />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/supported-chains" element={<SupportedChainsExample />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
    </Web3Provider>
    </QueryClientProvider>
  )
}

export default App
