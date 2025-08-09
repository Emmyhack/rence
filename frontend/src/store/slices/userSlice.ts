import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UserState {
  id: string | null
  address: string | null
  username: string | null
  email: string | null
  isAuthenticated: boolean
  trustScore: number
}

const initialState: UserState = {
  id: null,
  address: null,
  username: null,
  email: null,
  isAuthenticated: false,
  trustScore: 100,
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<Partial<UserState>>) => {
      Object.assign(state, action.payload)
      state.isAuthenticated = true
    },
    clearUser: (state) => {
      Object.assign(state, initialState)
    },
    updateTrustScore: (state, action: PayloadAction<number>) => {
      state.trustScore = action.payload
    },
  },
})

export const { setUser, clearUser, updateTrustScore } = userSlice.actions
export default userSlice.reducer