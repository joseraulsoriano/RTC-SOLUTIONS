import React, { useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import {
  Appbar,
  Snackbar,
  useTheme,
} from 'react-native-paper';
import { SearchBar } from '../components/SearchBar';
import { SearchResults } from '../components/SearchResults';
import { useSearch, useServerHealth } from '../hooks/useSearch';
import { useAppStore, useIsOnline, useIsLoading } from '../store/appStore';
import { SearchType } from '../types';

export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const isOnline = useIsOnline();
  const isGlobalLoading = useIsLoading();
  const { initializeNetworkListener } = useAppStore();

  const {
    performSearch,
    isLoading: isSearchLoading,
    error: searchError,
    data: searchData,
    reset: resetSearch,
  } = useSearch();

  const {
    data: serverHealth,
    error: healthError,
    refetch: refetchHealth,
  } = useServerHealth();

  // Initialize network listener
  useEffect(() => {
    const unsubscribe = initializeNetworkListener();
    return unsubscribe;
  }, [initializeNetworkListener]);

  const handleSearch = useCallback(async (query: string, type: SearchType) => {
    try {
      await performSearch({
        query,
        maxResults: 10,
        language: 'es',
        region: 'es',
        safeSearch: 'moderate',
      }, type);
    } catch (error) {
      console.error('Error en búsqueda:', error);
    }
  }, [performSearch]);

  const handleRetry = useCallback(() => {
    resetSearch();
    refetchHealth();
  }, [resetSearch, refetchHealth]);

  const isLoading = isSearchLoading || isGlobalLoading;
  const hasError = searchError || healthError;
  const showOfflineSnackbar = !isOnline;
  const showServerErrorSnackbar = !serverHealth && !healthError && isOnline;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />
      
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content 
          title="MCP Search" 
          subtitle="Búsqueda inteligente"
          titleStyle={{ color: theme.colors.onSurface }}
          subtitleStyle={{ color: theme.colors.outline }}
        />
        <Appbar.Action
          icon={serverHealth ? 'cloud-check' : 'cloud-off'}
          iconColor={serverHealth ? theme.colors.primary : theme.colors.error}
          onPress={refetchHealth}
        />
        <Appbar.Action
          icon={isOnline ? 'wifi' : 'wifi-off'}
          iconColor={isOnline ? theme.colors.primary : theme.colors.error}
          disabled
        />
      </Appbar.Header>

      <View style={styles.content}>
        <SearchBar
          onSearch={handleSearch}
          isLoading={isLoading}
          placeholder="Buscar en internet..."
        />

        <View style={styles.resultsContainer}>
          <SearchResults
            searchResponse={searchData}
            isLoading={isLoading}
            error={searchError}
            onRetry={handleRetry}
          />
        </View>
      </View>

      {/* Offline Snackbar */}
      <Snackbar
        visible={showOfflineSnackbar}
        onDismiss={() => {}}
        duration={Snackbar.DURATION_INDEFINITE}
        style={[styles.snackbar, { backgroundColor: theme.colors.errorContainer }]}
        action={{
          label: 'Reintentar',
          onPress: refetchHealth,
          textColor: theme.colors.onErrorContainer,
        }}
      >
        Sin conexión a internet
      </Snackbar>

      {/* Server Error Snackbar */}
      <Snackbar
        visible={showServerErrorSnackbar}
        onDismiss={() => {}}
        duration={10000}
        style={[styles.snackbar, { backgroundColor: theme.colors.errorContainer }]}
        action={{
          label: 'Reintentar',
          onPress: refetchHealth,
          textColor: theme.colors.onErrorContainer,
        }}
      >
        Servidor no disponible
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  resultsContainer: {
    flex: 1,
  },
  snackbar: {
    margin: 16,
  },
});