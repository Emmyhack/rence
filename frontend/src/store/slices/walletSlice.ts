import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { hematService } from '@services/web3/hematService';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  usdtBalance: string;
  isLoading: boolean;
  error: string | null;
  networkInfo: {
    chainId: number;
    name: string;
    isMainnet: boolean;
    isTestnet: boolean;
  } | null;
  tokenInfo: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    isTestnet: boolean;
  } | null;
}

const initialState: WalletState = {
  isConnected: false,
  address: null,
  usdtBalance: '0',
  isLoading: false,
  error: null,
  networkInfo: null,
  tokenInfo: null,
};

// Async thunks
export const connectWallet = createAsyncThunk(
  'wallet/connectWallet',
  async (_, { rejectWithValue }) => {
    try {
      const address = await hematService.connectWallet();
      if (address) {
        const balance = await hematService.getUSDTBalance(address);
        const networkInfo = hematService.getCurrentNetwork();
        const tokenInfo = hematService.getCurrentTokenInfo();
        
        return { 
          address, 
          balance,
          networkInfo: {
            chainId: networkInfo.chainId,
            name: networkInfo.config.name,
            isMainnet: networkInfo.isMainnet,
            isTestnet: networkInfo.isTestnet
          },
          tokenInfo
        };
      }
      return rejectWithValue('Failed to connect wallet');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const disconnectWallet = createAsyncThunk(
  'wallet/disconnectWallet',
  async () => {
    // Reset wallet state
    return null;
  }
);

export const updateBalance = createAsyncThunk(
  'wallet/updateBalance',
  async (address: string, { rejectWithValue }) => {
    try {
      const balance = await hematService.getUSDTBalance(address);
      return balance;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setAddress: (state, action: PayloadAction<string>) => {
      state.address = action.payload;
      state.isConnected = true;
    },
    setBalance: (state, action: PayloadAction<string>) => {
      state.usdtBalance = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetWallet: (state) => {
      state.isConnected = false;
      state.address = null;
      state.usdtBalance = '0';
      state.networkInfo = null;
      state.tokenInfo = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Connect wallet
      .addCase(connectWallet.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(connectWallet.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isConnected = true;
        state.address = action.payload.address;
        state.usdtBalance = action.payload.balance;
        state.networkInfo = action.payload.networkInfo;
        state.tokenInfo = action.payload.tokenInfo;
        state.error = null;
      })
      .addCase(connectWallet.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Disconnect wallet
      .addCase(disconnectWallet.fulfilled, (state) => {
        state.isConnected = false;
        state.address = null;
        state.usdtBalance = '0';
        state.networkInfo = null;
        state.tokenInfo = null;
        state.error = null;
      })
      // Update balance
      .addCase(updateBalance.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateBalance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.usdtBalance = action.payload;
      })
      .addCase(updateBalance.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setAddress, setBalance, setError, clearError, resetWallet } = walletSlice.actions;
export default walletSlice.reducer;