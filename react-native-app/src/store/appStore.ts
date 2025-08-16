import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState, SearchHistory, AppConfig } from '../types';

interface AppStore extends AppState {
  // Actions
  setLoading: (loading: boolean) => void;
  setOnlineStatus: (isOnline: boolean) => void;
  addToHistory: (search: SearchHistory) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  updateConfig: (config: Partial<AppConfig>) => void;
  initializeNetworkListener: () => void;
}

const defaultConfig: AppConfig = {
  apiBaseUrl: 'http://localhost:3000',
  timeout: 15000,
  maxRetries: 3,
  cacheTimeout: 300000, // 5 minutes
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: true,
      isLoading: false,
      searchHistory: [],
      config: defaultConfig,

      // Actions
      setLoading: (loading: boolean) => 
        set({ isLoading: loading }),

      setOnlineStatus: (isOnline: boolean) => 
        set({ isOnline }),

      addToHistory: (search: SearchHistory) => 
        set((state) => ({
          searchHistory: [search, ...state.searchHistory.slice(0, 49)] // Keep only last 50
        })),

      removeFromHistory: (id: string) => 
        set((state) => ({
          searchHistory: state.searchHistory.filter(item => item.id !== id)
        })),

      clearHistory: () => 
        set({ searchHistory: [] }),

      updateConfig: (newConfig: Partial<AppConfig>) => 
        set((state) => ({
          config: { ...state.config, ...newConfig }
        })),

      initializeNetworkListener: () => {
        const unsubscribe = NetInfo.addEventListener(state => {
          get().setOnlineStatus(state.isConnected ?? false);
        });

        // Return cleanup function
        return unsubscribe;
      },
    }),
    {
      name: 'mcp-search-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        config: state.config,
      }),
    }
  )
);

// Selector hooks for better performance
export const useIsLoading = () => useAppStore(state => state.isLoading);
export const useIsOnline = () => useAppStore(state => state.isOnline);
export const useSearchHistory = () => useAppStore(state => state.searchHistory);
export const useAppConfig = () => useAppStore(state => state.config);