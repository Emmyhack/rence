import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Group {
  id: string
  name: string
  description: string
  memberCount: number
  totalValue: string
  status: 'active' | 'inactive' | 'completed'
}

interface GroupsState {
  groups: Group[]
  loading: boolean
  error: string | null
}

const initialState: GroupsState = {
  groups: [],
  loading: false,
  error: null,
}

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setGroups: (state, action: PayloadAction<Group[]>) => {
      state.groups = action.payload
      state.loading = false
      state.error = null
    },
    addGroup: (state, action: PayloadAction<Group>) => {
      state.groups.push(action.payload)
    },
    updateGroup: (state, action: PayloadAction<Group>) => {
      const index = state.groups.findIndex(g => g.id === action.payload.id)
      if (index !== -1) {
        state.groups[index] = action.payload
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.loading = false
    },
  },
})

export const { setGroups, addGroup, updateGroup, setLoading, setError } = groupsSlice.actions
export default groupsSlice.reducer