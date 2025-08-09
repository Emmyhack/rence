import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// Import slice reducers
import walletReducer from './slices/walletSlice';
import userReducer from './slices/userSlice';
import groupsReducer from './slices/groupsSlice';
import notificationsReducer from './slices/notificationsSlice';
import uiReducer from './slices/uiSlice';

// Persist configuration
const persistConfig = {
  key: 'hemat-root',
  storage,
  whitelist: ['wallet', 'user'], // Only persist wallet and user data
  blacklist: ['notifications', 'ui'], // Don't persist temporary data
};

// Root reducer
const rootReducer = combineReducers({
  wallet: walletReducer,
  user: userReducer,
  groups: groupsReducer,
  notifications: notificationsReducer,
  ui: uiReducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
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

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;