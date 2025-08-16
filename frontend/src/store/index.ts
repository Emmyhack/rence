import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Import slices
import walletReducer from './slices/walletSlice';
import groupsReducer from './slices/groupsSlice';
import insuranceReducer from './slices/insuranceSlice';
import stakingReducer from './slices/stakingSlice';

// Root reducer
const rootReducer = combineReducers({
  wallet: walletReducer,
  groups: groupsReducer,
  insurance: insuranceReducer,
  staking: stakingReducer,
});

// Persist configuration
const persistConfig = {
  key: 'hemat-root',
  storage,
  whitelist: ['wallet'], // Only persist wallet state
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store configuration
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Persistor
export const persistor = persistStore(store);

// Root state type
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;