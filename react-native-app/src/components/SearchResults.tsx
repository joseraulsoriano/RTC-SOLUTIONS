import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Linking,
  Share,
  Alert,
} from 'react-native';
import {
  Card,
  Text,
  IconButton,
  Chip,
  Button,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { SearchResult, SearchResponse } from '../types';

interface SearchResultsProps {
  searchResponse: SearchResponse | null;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  searchResponse,
  isLoading,
  error,
  onRetry,
}) => {
  const theme = useTheme();

  const handleOpenUrl = useCallback(async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se puede abrir este enlace');
      }
    } catch (err) {
      Alert.alert('Error', 'Error al abrir el enlace');
    }
  }, []);

  const handleShare = useCallback(async (result: SearchResult) => {
    try {
      await Share.share({
        message: `${result.title}\n\n${result.snippet}\n\n${result.url}`,
        url: result.url,
        title: result.title,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  }, []);

  const renderResultItem = useCallback(({ item, index }: { item: SearchResult; index: number }) => (
    <Card style={[styles.resultCard, { backgroundColor: theme.colors.surface }]} mode="outlined">
      <Card.Content>
        <View style={styles.resultHeader}>
          <Text variant="bodySmall" style={[styles.resultIndex, { color: theme.colors.primary }]}>
            {index + 1}
          </Text>
          <Text variant="bodySmall" style={[styles.displayUrl, { color: theme.colors.outline }]}>
            {item.displayUrl}
          </Text>
        </View>
        
        <Text 
          variant="titleMedium" 
          style={[styles.resultTitle, { color: theme.colors.primary }]}
          onPress={() => handleOpenUrl(item.url)}
        >
          {item.title}
        </Text>
        
        <Text variant="bodyMedium" style={[styles.resultSnippet, { color: theme.colors.onSurface }]}>
          {item.snippet}
        </Text>
        
        {item.datePublished && (
          <Chip 
            icon="calendar" 
            style={styles.dateChip}
            textStyle={styles.dateText}
          >
            {new Date(item.datePublished).toLocaleDateString()}
          </Chip>
        )}
      </Card.Content>
      
      <Card.Actions style={styles.resultActions}>
        <Button 
          mode="outlined" 
          onPress={() => handleOpenUrl(item.url)}
          icon="open-in-new"
          compact
        >
          Abrir
        </Button>
        <IconButton
          icon="share"
          onPress={() => handleShare(item)}
          size={20}
        />
      </Card.Actions>
    </Card>
  ), [theme, handleOpenUrl, handleShare]);

  const renderHeader = useCallback(() => {
    if (!searchResponse) return null;

    return (
      <View style={[styles.header, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="titleLarge" style={styles.searchQuery}>
          "{searchResponse.query}"
        </Text>
        <View style={styles.searchStats}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {searchResponse.totalResults.toLocaleString()} resultados
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            ({searchResponse.searchTime}ms)
          </Text>
        </View>
      </View>
    );
  }, [searchResponse, theme]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <IconButton icon="magnify" size={64} iconColor={theme.colors.outline} />
      <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
        Realiza una búsqueda
      </Text>
      <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.outline }]}>
        Ingresa un término de búsqueda para encontrar información en internet
      </Text>
    </View>
  ), [theme]);

  const renderErrorState = useCallback(() => (
    <View style={styles.errorState}>
      <IconButton icon="alert-circle" size={64} iconColor={theme.colors.error} />
      <Text variant="headlineSmall" style={[styles.errorTitle, { color: theme.colors.error }]}>
        Error en la búsqueda
      </Text>
      <Text variant="bodyMedium" style={[styles.errorMessage, { color: theme.colors.onSurface }]}>
        {error?.message || 'Ocurrió un error inesperado'}
      </Text>
      {onRetry && (
        <Button 
          mode="contained" 
          onPress={onRetry}
          style={styles.retryButton}
          icon="refresh"
        >
          Reintentar
        </Button>
      )}
    </View>
  ), [theme, error, onRetry]);

  const renderLoadingState = useCallback(() => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text variant="bodyLarge" style={[styles.loadingText, { color: theme.colors.onSurface }]}>
        Buscando...
      </Text>
    </View>
  ), [theme]);

  if (isLoading) {
    return renderLoadingState();
  }

  if (error) {
    return renderErrorState();
  }

  if (!searchResponse) {
    return renderEmptyState();
  }

  if (searchResponse.results.length === 0) {
    return (
      <View style={styles.noResultsState}>
        <IconButton icon="file-search-outline" size={64} iconColor={theme.colors.outline} />
        <Text variant="headlineSmall" style={[styles.noResultsTitle, { color: theme.colors.onSurface }]}>
          Sin resultados
        </Text>
        <Text variant="bodyMedium" style={[styles.noResultsSubtitle, { color: theme.colors.outline }]}>
          No se encontraron resultados para "{searchResponse.query}"
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={searchResponse.results}
      renderItem={renderResultItem}
      keyExtractor={(item, index) => `${item.url}-${index}`}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={100}
      windowSize={10}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  header: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  searchQuery: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  searchStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCard: {
    marginBottom: 12,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultIndex: {
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 20,
  },
  displayUrl: {
    flex: 1,
    fontSize: 12,
  },
  resultTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 22,
  },
  resultSnippet: {
    lineHeight: 20,
    marginBottom: 8,
  },
  dateChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
  },
  resultActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    marginTop: 8,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  noResultsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noResultsTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsSubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
});