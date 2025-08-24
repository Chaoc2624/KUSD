import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ethers } from 'ethers';
import { api } from '../consts/Apis';
import type { LoginSIWERequest } from '../consts/Apis';
import { useWeb3 } from './Web3Context';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  user: any | null;
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { account, signer, isConnected } = useWeb3();

  // Check for existing token on mount
  useEffect(() => {
    const existingToken = localStorage.getItem('kusd_auth_token');
    if (existingToken) {
      setToken(existingToken);
      setIsAuthenticated(true);
      // TODO: Validate token with backend
    }
  }, []);

  const login = useCallback(async () => {
    if (!account || !signer || !isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Step 1: Get nonce from backend
      const nonceResponse = await api.getNonce();
      if (!nonceResponse.success || !nonceResponse.data) {
        throw new Error(nonceResponse.error || 'Failed to get nonce');
      }

      const { nonce, message } = nonceResponse.data;

      // Step 2: Sign the message with wallet
      const signature = await signer.signMessage(message);

      // Step 3: Send login request
      const loginRequest: LoginSIWERequest = {
        message,
        signature,
        address: account
      };

      const loginResponse = await api.loginSIWE(loginRequest);
      if (!loginResponse.success || !loginResponse.data) {
        throw new Error(loginResponse.error || 'Login failed');
      }

      const { token: authToken, user: userData } = loginResponse.data;

      // Store token and user data
      localStorage.setItem('kusd_auth_token', authToken);
      setToken(authToken);
      setUser(userData);
      setIsAuthenticated(true);
      setError(null);

      console.log('Authentication successful:', userData);

    } catch (error: any) {
      console.error('Authentication error:', error);
      setError(error.message || 'Authentication failed');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [account, signer, isConnected]);

  const logout = useCallback(() => {
    localStorage.removeItem('kusd_auth_token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  // Auto-login when wallet connects
  useEffect(() => {
    if (isConnected && account && !isAuthenticated && !isLoading) {
      // Small delay to ensure wallet is fully connected
      const timer = setTimeout(() => {
        login();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConnected, account, isAuthenticated, isLoading, login]);

  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    token,
    user,
    login,
    logout,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
