import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { hematService, GroupConfig, GroupInfo } from '@services/web3/hematService';

export interface GroupsState {
  groups: GroupInfo[];
  userGroups: GroupInfo[];
  createdGroups: GroupInfo[];
  currentGroup: GroupInfo | null;
  isLoading: boolean;
  error: string | null;
  platformStats: {
    totalGroups: number;
    totalActive: number;
    maxGroupsPerCreator: number;
    minContribution: string;
    maxContribution: string;
    minGroupSize: number;
    maxGroupSize: number;
  } | null;
}

const initialState: GroupsState = {
  groups: [],
  userGroups: [],
  createdGroups: [],
  currentGroup: null,
  isLoading: false,
  error: null,
  platformStats: null,
};

// Async thunks
export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async (config: GroupConfig, { rejectWithValue }) => {
    try {
      const groupId = await hematService.createGroup(config);
      if (groupId) {
        // Get the group address and info
        const groupAddress = await hematService.getGroupAddress(groupId);
        if (groupAddress) {
          const groupInfo = await hematService.getGroupInfo(groupAddress);
          if (groupInfo) {
            groupInfo.id = groupId;
            return groupInfo;
          }
        }
      }
      return rejectWithValue('Failed to create group');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchUserGroups = createAsyncThunk(
  'groups/fetchUserGroups',
  async (address: string, { rejectWithValue }) => {
    try {
      const [creatorGroupIds, memberGroupIds] = await Promise.all([
        hematService.getGroupsByCreator(address),
        hematService.getGroupsByMember(address)
      ]);

      const allGroupIds = [...new Set([...creatorGroupIds, ...memberGroupIds])];
      const groups: GroupInfo[] = [];

      for (const groupId of allGroupIds) {
        const groupAddress = await hematService.getGroupAddress(groupId);
        if (groupAddress) {
          const groupInfo = await hematService.getGroupInfo(groupAddress);
          if (groupInfo) {
            groupInfo.id = groupId;
            groups.push(groupInfo);
          }
        }
      }

      return {
        creatorGroups: groups.filter(g => creatorGroupIds.includes(g.id)),
        memberGroups: groups.filter(g => memberGroupIds.includes(g.id) && !creatorGroupIds.includes(g.id))
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchGroupsByModel = createAsyncThunk(
  'groups/fetchGroupsByModel',
  async (model: number, { rejectWithValue }) => {
    try {
      const groupIds = await hematService.getGroupsByModel(model);
      const groups: GroupInfo[] = [];

      for (const groupId of groupIds) {
        const groupAddress = await hematService.getGroupAddress(groupId);
        if (groupAddress) {
          const groupInfo = await hematService.getGroupInfo(groupAddress);
          if (groupInfo) {
            groupInfo.id = groupId;
            groups.push(groupInfo);
          }
        }
      }

      return groups;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchGroupInfo = createAsyncThunk(
  'groups/fetchGroupInfo',
  async (groupAddress: string, { rejectWithValue }) => {
    try {
      const groupInfo = await hematService.getGroupInfo(groupAddress);
      if (groupInfo) {
        return groupInfo;
      }
      return rejectWithValue('Failed to fetch group info');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const fetchPlatformStats = createAsyncThunk(
  'groups/fetchPlatformStats',
  async (_, { rejectWithValue }) => {
    try {
      const stats = await hematService.getPlatformStats();
      if (stats) {
        return stats;
      }
      return rejectWithValue('Failed to fetch platform stats');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const joinGroup = createAsyncThunk(
  'groups/joinGroup',
  async ({ groupAddress, stakeAmount }: { groupAddress: string; stakeAmount: string }, { rejectWithValue }) => {
    try {
      const success = await hematService.joinGroup(groupAddress, stakeAmount);
      if (success) {
        // Refresh group info
        const groupInfo = await hematService.getGroupInfo(groupAddress);
        return groupInfo;
      }
      return rejectWithValue('Failed to join group');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const contributeToGroup = createAsyncThunk(
  'groups/contributeToGroup',
  async ({ groupAddress, amount }: { groupAddress: string; amount: string }, { rejectWithValue }) => {
    try {
      const success = await hematService.contributeToGroup(groupAddress, amount);
      if (success) {
        // Refresh group info
        const groupInfo = await hematService.getGroupInfo(groupAddress);
        return groupInfo;
      }
      return rejectWithValue('Failed to contribute to group');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

export const claimPayout = createAsyncThunk(
  'groups/claimPayout',
  async (groupAddress: string, { rejectWithValue }) => {
    try {
      const success = await hematService.claimPayout(groupAddress);
      if (success) {
        // Refresh group info
        const groupInfo = await hematService.getGroupInfo(groupAddress);
        return groupInfo;
      }
      return rejectWithValue('Failed to claim payout');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setCurrentGroup: (state, action: PayloadAction<GroupInfo | null>) => {
      state.currentGroup = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetGroups: (state) => {
      state.groups = [];
      state.userGroups = [];
      state.createdGroups = [];
      state.currentGroup = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create group
      .addCase(createGroup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.createdGroups.unshift(action.payload);
        state.currentGroup = action.payload;
        state.error = null;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch user groups
      .addCase(fetchUserGroups.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserGroups.fulfilled, (state, action) => {
        state.isLoading = false;
        state.createdGroups = action.payload.creatorGroups;
        state.userGroups = action.payload.memberGroups;
        state.error = null;
      })
      .addCase(fetchUserGroups.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch groups by model
      .addCase(fetchGroupsByModel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGroupsByModel.fulfilled, (state, action) => {
        state.isLoading = false;
        state.groups = action.payload;
        state.error = null;
      })
      .addCase(fetchGroupsByModel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch group info
      .addCase(fetchGroupInfo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGroupInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentGroup = action.payload;
        state.error = null;
      })
      .addCase(fetchGroupInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch platform stats
      .addCase(fetchPlatformStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPlatformStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.platformStats = action.payload;
        state.error = null;
      })
      .addCase(fetchPlatformStats.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Join group
      .addCase(joinGroup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(joinGroup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentGroup = action.payload;
        // Update in user groups
        const existingIndex = state.userGroups.findIndex(g => g.address === action.payload.address);
        if (existingIndex >= 0) {
          state.userGroups[existingIndex] = action.payload;
        } else {
          state.userGroups.push(action.payload);
        }
        state.error = null;
      })
      .addCase(joinGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Contribute to group
      .addCase(contributeToGroup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(contributeToGroup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentGroup = action.payload;
        // Update in all relevant arrays
        const updateGroupInArray = (groups: GroupInfo[], updatedGroup: GroupInfo) => {
          const index = groups.findIndex(g => g.address === updatedGroup.address);
          if (index >= 0) {
            groups[index] = updatedGroup;
          }
        };
        updateGroupInArray(state.userGroups, action.payload);
        updateGroupInArray(state.createdGroups, action.payload);
        updateGroupInArray(state.groups, action.payload);
        state.error = null;
      })
      .addCase(contributeToGroup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Claim payout
      .addCase(claimPayout.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(claimPayout.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentGroup = action.payload;
        // Update in all relevant arrays
        const updateGroupInArray = (groups: GroupInfo[], updatedGroup: GroupInfo) => {
          const index = groups.findIndex(g => g.address === updatedGroup.address);
          if (index >= 0) {
            groups[index] = updatedGroup;
          }
        };
        updateGroupInArray(state.userGroups, action.payload);
        updateGroupInArray(state.createdGroups, action.payload);
        updateGroupInArray(state.groups, action.payload);
        state.error = null;
      })
      .addCase(claimPayout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentGroup, clearError, resetGroups } = groupsSlice.actions;
export default groupsSlice.reducer;