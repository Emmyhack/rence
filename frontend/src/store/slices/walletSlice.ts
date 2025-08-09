import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface WalletState {
  address: string | null
  isConnected: boolean
  balance: string
  chainId: number | null
}

const initialState: WalletState = {
  address: null,
  isConnected: false,
  balance: '0',
  chainId: null,
}

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWalletConnected: (state, action: PayloadAction<{ address: string; chainId: number }>) => {
      state.address = action.payload.address
      state.chainId = action.payload.chainId
      state.isConnected = true
    },
    setWalletDisconnected: (state) => {
      state.address = null
      state.chainId = null
      state.isConnected = false
      state.balance = '0'
    },
    setBalance: (state, action: PayloadAction<string>) => {
      state.balance = action.payload
    },
  },
})

export const { setWalletConnected, setWalletDisconnected, setBalance } = walletSlice.actions
export default walletSlice.reducer