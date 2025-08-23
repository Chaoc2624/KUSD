// API Configuration and Endpoints for KUSD Backend
export const API_CONFIG = {
  BASE_URL: "https://kusd-core.onrender.com",
  VERSION: "v1",
  TIMEOUT: 30000, // 30 seconds
};

// API Endpoints
export const API_ENDPOINTS = {
  // Health Check
  HEALTH: "/health",

  // Public Routes
  META: {
    SUPPORTED_CHAINS: "/api/v1/meta/supported",
  },

  AUTH: {
    NONCE: "/api/v1/auth/nonce",
    LOGIN_SIWE: "/api/v1/user/login-siwe",
  },

  PROOFS: {
    LATEST: "/api/v1/proofs/latest",
  },

  // Protected Routes (require JWT token)
  USER: {
    PROFILE: "/api/v1/user/profile",
  },

  WALLET: {
    DEPOSIT_ADDRESS: "/api/v1/wallet/deposit-address",
    WITHDRAW: "/api/v1/withdraw",
  },

  PORTFOLIO: {
    OVERVIEW: "/api/v1/portfolio/overview",
  },

  RECORDS: {
    GET_RECORDS: "/api/v1/records",
  },
};

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp?: string;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  timestamp?: string;
}

export interface SupportedAsset {
  symbol: string;
  decimals: number;
  minDeposit: string;
}

export interface SupportedChain {
  chain: string;
  chainId: number;
  assets: SupportedAsset[] | null;
}

export interface SupportedChainsResponse {
  chains: SupportedChain[];
  timestamp: number;
}

export interface NonceResponse {
  nonce: string;
  message: string; // Required - the backend should provide the complete SIWE message
  expiresAt?: string; // Optional
}

export interface LoginSIWERequest {
  message: string;
  signature: string;
  address: string;
}

export interface LoginSIWEResponse {
  token: string;
  user: {
    id: string;
    address: string;
    profile?: UserProfile;
  };
}

export interface UserProfile {
  id: string;
  address: string;
  username?: string;
  email?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepositAddressRequest {
  chain: string;
  asset: string;
}

export interface DepositAddressResponse {
  address: string;
  chain: string;
  asset: string;
  qrCode?: string;
  expiresAt?: string;
}

export interface WithdrawRequest {
  chainId: number;
  tokenSymbol: string;
  amount: string;
  recipientAddress: string;
}

export interface WithdrawResponse {
  txHash: string;
  status: "pending" | "confirmed" | "failed";
  chainId: number;
  amount: string;
  recipientAddress: string;
}

export interface PortfolioOverview {
  totalValue: string;
  totalValueUSD: string;
  assets: PortfolioAsset[];
  performance: {
    daily: string;
    weekly: string;
    monthly: string;
    yearly: string;
  };
  lastUpdated: string;
}

// Updated to match backend response structure
export interface PortfolioOverviewResponse {
  totalKusd: string;
  apy: number;
  tvlKusd: string;
  byAsset: PortfolioAsset[];
}

export interface PortfolioAsset {
  chain: string;
  asset: string;
  amount: string;
  kusd: string;
}

export interface TransactionRecord {
  id: string;
  type: "deposit" | "withdraw" | "swap" | "stake" | "unstake";
  status: "pending" | "confirmed" | "failed";
  chainId: number;
  tokenSymbol: string;
  amount: string;
  amountUSD: string;
  txHash?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface RecordsResponse {
  records: TransactionRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Service Class
class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  // Helper method to get full URL
  private getFullUrl(endpoint: string): string {
    return `${this.baseURL}${endpoint}`;
  }

  // Helper method to get headers
  private getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    token?: string
  ): Promise<ApiResponse<T>> {
    try {
      const url = this.getFullUrl(endpoint);
      const headers = this.getHeaders(token);

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error(`API request failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error.message || "Request failed",
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.request<HealthCheckResponse>(API_ENDPOINTS.HEALTH);
  }

  // Meta APIs
  async getSupportedChains(): Promise<ApiResponse<SupportedChainsResponse>> {
    return this.request<SupportedChainsResponse>(API_ENDPOINTS.META.SUPPORTED_CHAINS);
  }

  // Auth APIs
  async getNonce(): Promise<ApiResponse<NonceResponse>> {
    return this.request<NonceResponse>(API_ENDPOINTS.AUTH.NONCE);
  }

  async loginSIWE(
    requestData: LoginSIWERequest
  ): Promise<ApiResponse<LoginSIWEResponse>> {
    return this.request<LoginSIWEResponse>(API_ENDPOINTS.AUTH.LOGIN_SIWE, {
      method: "POST",
      body: JSON.stringify(requestData),
    });
  }

  // Proofs APIs
  async getLatestProofs(): Promise<ApiResponse<any>> {
    return this.request<any>(API_ENDPOINTS.PROOFS.LATEST);
  }

  // Protected User APIs
  async getUserProfile(token: string): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>(API_ENDPOINTS.USER.PROFILE, {}, token);
  }

  // Protected Wallet APIs
  async getDepositAddress(
    requestData: DepositAddressRequest,
    token: string
  ): Promise<ApiResponse<DepositAddressResponse>> {
    const queryParams = new URLSearchParams({
      chain: requestData.chain,
      asset: requestData.asset,
    });

    return this.request<DepositAddressResponse>(
      `${API_ENDPOINTS.WALLET.DEPOSIT_ADDRESS}?${queryParams}`,
      {},
      token
    );
  }

  // Public Wallet APIs (no authentication required)
  async getDepositAddressPublic(
    requestData: DepositAddressRequest
  ): Promise<ApiResponse<DepositAddressResponse>> {
    const queryParams = new URLSearchParams({
      chain: requestData.chain,
      asset: requestData.asset,
    });

    return this.request<DepositAddressResponse>(
      `${API_ENDPOINTS.WALLET.DEPOSIT_ADDRESS}?${queryParams}`,
      {}
    );
  }

  async withdraw(
    requestData: WithdrawRequest,
    token: string
  ): Promise<ApiResponse<WithdrawResponse>> {
    return this.request<WithdrawResponse>(
      API_ENDPOINTS.WALLET.WITHDRAW,
      {
        method: "POST",
        body: JSON.stringify(requestData),
      },
      token
    );
  }

  // Protected Portfolio APIs
  async getPortfolioOverview(
    token: string
  ): Promise<ApiResponse<PortfolioOverview>> {
    return this.request<PortfolioOverview>(
      API_ENDPOINTS.PORTFOLIO.OVERVIEW,
      {},
      token
    );
  }

  // Public Portfolio APIs (no authentication required)
  async getPortfolioOverviewPublic(): Promise<ApiResponse<PortfolioOverviewResponse>> {
    return this.request<PortfolioOverviewResponse>(
      API_ENDPOINTS.PORTFOLIO.OVERVIEW,
      {}
    );
  }

  // Protected Records APIs
  async getRecords(
    params: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
      chainId?: number;
    } = {},
    token: string
  ): Promise<ApiResponse<RecordsResponse>> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.type) queryParams.append("type", params.type);
    if (params.status) queryParams.append("status", params.status);
    if (params.chainId)
      queryParams.append("chainId", params.chainId.toString());

    const endpoint = queryParams.toString()
      ? `${API_ENDPOINTS.RECORDS.GET_RECORDS}?${queryParams}`
      : API_ENDPOINTS.RECORDS.GET_RECORDS;

    return this.request<RecordsResponse>(endpoint, {}, token);
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();

// Convenience functions for common operations
export const api = {
  // Health
  health: () => apiService.healthCheck(),

  // Meta
  getSupportedChains: () => apiService.getSupportedChains(),

  // Auth
  getNonce: () => apiService.getNonce(),
  loginSIWE: (data: LoginSIWERequest) => apiService.loginSIWE(data),

  // Proofs
  getLatestProofs: () => apiService.getLatestProofs(),

  // User (protected)
  getUserProfile: (token: string) => apiService.getUserProfile(token),

  // Wallet (protected)
  getDepositAddress: (data: DepositAddressRequest, token: string) =>
    apiService.getDepositAddress(data, token),
  getDepositAddressPublic: (data: DepositAddressRequest) =>
    apiService.getDepositAddressPublic(data),
  withdraw: (data: WithdrawRequest, token: string) =>
    apiService.withdraw(data, token),

  // Portfolio (protected)
  getPortfolioOverview: (token: string) =>
    apiService.getPortfolioOverview(token),

  // Public Portfolio
  getPortfolioOverviewPublic: () =>
    apiService.getPortfolioOverviewPublic(),

  // Records (protected)
  getRecords: (token: string, params?: any) =>
    apiService.getRecords(params, token),
};

// Utility functions
export const isApiResponse = (response: any): response is ApiResponse => {
  return response && typeof response.success === "boolean";
};

export const handleApiError = (response: ApiResponse): string => {
  if (response.error) return response.error;
  if (response.message) return response.message;
  return "An unknown error occurred";
};

export const createApiError = (message: string): ApiResponse => ({
  success: false,
  error: message,
  timestamp: new Date().toISOString(),
});

export default api;
