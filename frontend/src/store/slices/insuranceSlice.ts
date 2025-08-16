import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { hematService, InsuranceClaim } from '@services/web3/hematService';

export interface InsuranceState {
  claims: InsuranceClaim[];
  userClaims: InsuranceClaim[];
  currentClaim: InsuranceClaim | null;
  isLoading: boolean;
  error: string | null;
  poolStats: {
    totalPremiums: string;
    totalClaims: string;
    reserveRatio: string;
    minReserveRatio: string;
    maxReserveRatio: string;
  } | null;
}

const initialState: InsuranceState = {
  claims: [],
  userClaims: [],
  currentClaim: null,
  isLoading: false,
  error: null,
  poolStats: null,
};

// Async thunks
export const submitInsuranceClaim = createAsyncThunk(
  'insurance/submitClaim',
  async ({ groupId, amount, evidenceCID }: { groupId: number; amount: string; evidenceCID: string }, { rejectWithValue }) => {
    try {
      const claimId = await hematService.submitInsuranceClaim(groupId, amount, evidenceCID);
      if (claimId) {
        // Get the claim details
        const claim = await hematService.getInsuranceClaim(claimId);
        return claim;
      }
      return rejectWithValue('Failed to submit insurance claim');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchUserClaims = createAsyncThunk(
  'insurance/fetchUserClaims',
  async (address: string, { rejectWithValue }) => {
    try {
      const claimIds = await hematService.getInsuranceClaimsByMember(address);
      const claims: InsuranceClaim[] = [];

      for (const claimId of claimIds) {
        const claim = await hematService.getInsuranceClaim(claimId);
        if (claim) {
          claims.push(claim);
        }
      }

      return claims;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchClaimDetails = createAsyncThunk(
  'insurance/fetchClaimDetails',
  async (claimId: number, { rejectWithValue }) => {
    try {
      const claim = await hematService.getInsuranceClaim(claimId);
      if (claim) {
        return claim;
      }
      return rejectWithValue('Failed to fetch claim details');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchPoolStats = createAsyncThunk(
  'insurance/fetchPoolStats',
  async (_, { rejectWithValue }) => {
    try {
      // This would need to be implemented in the service
      // For now, returning mock data
      return {
        totalPremiums: '0',
        totalClaims: '0',
        reserveRatio: '0',
        minReserveRatio: '0',
        maxReserveRatio: '0'
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const insuranceSlice = createSlice({
  name: 'insurance',
  initialState,
  reducers: {
    setCurrentClaim: (state, action: PayloadAction<InsuranceClaim | null>) => {
      state.currentClaim = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetInsurance: (state) => {
      state.claims = [];
      state.userClaims = [];
      state.currentClaim = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Submit claim
      .addCase(submitInsuranceClaim.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(submitInsuranceClaim.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentClaim = action.payload;
        state.userClaims.unshift(action.payload);
        state.error = null;
      })
      .addCase(submitInsuranceClaim.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch user claims
      .addCase(fetchUserClaims.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserClaims.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userClaims = action.payload;
        state.error = null;
      })
      .addCase(fetchUserClaims.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch claim details
      .addCase(fetchClaimDetails.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClaimDetails.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentClaim = action.payload;
        state.error = null;
      })
      .addCase(fetchClaimDetails.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch pool stats
      .addCase(fetchPoolStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPoolStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.poolStats = action.payload;
        state.error = null;
      })
      .addCase(fetchPoolStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentClaim, clearError, resetInsurance } = insuranceSlice.actions;
export default insuranceSlice.reducer;