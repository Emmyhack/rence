import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { hematService, StakeInfo } from '@services/web3/hematService';

export interface StakingState {
  stakeInfo: StakeInfo | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: StakingState = {
  stakeInfo: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const depositStake = createAsyncThunk(
  'staking/depositStake',
  async (amount: string, { rejectWithValue }) => {
    try {
      const success = await hematService.stake(amount);
      if (success) {
        // Refresh stake info
        const address = await hematService.getConnectedAddress();
        if (address) {
          const stakeInfo = await hematService.getUserStakeInfo(address);
          return stakeInfo;
        }
      }
      return rejectWithValue('Failed to deposit stake');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const withdrawStake = createAsyncThunk(
  'staking/withdrawStake',
  async (amount: string, { rejectWithValue }) => {
    try {
      const success = await hematService.unstake(amount);
      if (success) {
        // Refresh stake info
        const address = await hematService.getConnectedAddress();
        if (address) {
          const stakeInfo = await hematService.getUserStakeInfo(address);
          return stakeInfo;
        }
      }
      return rejectWithValue('Failed to withdraw stake');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchStakeInfo = createAsyncThunk(
  'staking/fetchStakeInfo',
  async (address: string, { rejectWithValue }) => {
    try {
      const stakeInfo = await hematService.getUserStakeInfo(address);
      if (stakeInfo) {
        return stakeInfo;
      }
      return rejectWithValue('Failed to fetch stake info');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const stakingSlice = createSlice({
  name: 'staking',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetStaking: (state) => {
      state.stakeInfo = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Deposit stake
      .addCase(depositStake.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(depositStake.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stakeInfo = action.payload;
        state.error = null;
      })
      .addCase(depositStake.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Withdraw stake
      .addCase(withdrawStake.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(withdrawStake.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stakeInfo = action.payload;
        state.error = null;
      })
      .addCase(withdrawStake.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch stake info
      .addCase(fetchStakeInfo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStakeInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stakeInfo = action.payload;
        state.error = null;
      })
      .addCase(fetchStakeInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, resetStaking } = stakingSlice.actions;
export default stakingSlice.reducer;