import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Dimensions,
} from 'react-native';
import {
  Searchbar,
  Button,
  Chip,
  Text,
  Card,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { SearchType } from '../types';
import { useSearchSuggestions } from '../hooks/useSearch';

interface SearchBarProps {
  onSearch: (query: string, type: SearchType) => void;
  isLoading?: boolean;
  placeholder?: string;
}

const { width } = Dimensions.get('window');

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  isLoading = false,
  placeholder = 'Buscar en internet...',
}) => {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<SearchType>('general');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const { suggestions } = useSearchSuggestions(query);

  const searchTypes: Array<{ key: SearchType; label: string; icon: string }> = [
    { key: 'general', label: 'General', icon: 'web' },
    { key: 'news', label: 'Noticias', icon: 'newspaper' },
    { key: 'academic', label: 'Académico', icon: 'school' },
  ];

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      onSearch(query.trim(), selectedType);
      setShowSuggestions(false);
    }
  }, [query, selectedType, onSearch]);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion, selectedType);
  }, [selectedType, onSearch]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    setShowSuggestions(text.length > 1 && suggestions.length > 0);
  }, [suggestions.length]);

  const renderSuggestion = useCallback(({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <Text variant="bodyMedium">{item}</Text>
    </TouchableOpacity>
  ), [handleSuggestionPress]);

  const renderSearchType = useCallback(({ item }: { item: typeof searchTypes[0] }) => (
    <TouchableOpacity
      style={[
        styles.typeItem,
        selectedType === item.key && { backgroundColor: theme.colors.primaryContainer }
      ]}
      onPress={() => {
        setSelectedType(item.key);
        setShowTypeModal(false);
      }}
    >
      <IconButton icon={item.icon} size={24} />
      <Text variant="bodyLarge">{item.label}</Text>
    </TouchableOpacity>
  ), [selectedType, theme.colors.primaryContainer]);

  const selectedTypeInfo = searchTypes.find(t => t.key === selectedType);

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={placeholder}
          onChangeText={handleQueryChange}
          value={query}
          onSubmitEditing={handleSearch}
          loading={isLoading}
          style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
          inputStyle={styles.searchInput}
          iconColor={theme.colors.primary}
        />
        
        <TouchableOpacity
          style={[styles.typeButton, { backgroundColor: theme.colors.primaryContainer }]}
          onPress={() => setShowTypeModal(true)}
        >
          <IconButton 
            icon={selectedTypeInfo?.icon || 'web'} 
            size={20}
            iconColor={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.chipContainer}>
        <Chip
          icon={selectedTypeInfo?.icon}
          onPress={() => setShowTypeModal(true)}
          style={[styles.typeChip, { backgroundColor: theme.colors.primaryContainer }]}
        >
          {selectedTypeInfo?.label}
        </Chip>
        
        <Button
          mode="contained"
          onPress={handleSearch}
          disabled={!query.trim() || isLoading}
          style={styles.searchButton}
          contentStyle={styles.searchButtonContent}
        >
          Buscar
        </Button>
      </View>

      {/* Suggestions Modal */}
      <Modal
        visible={showSuggestions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <TouchableOpacity
          style={styles.suggestionOverlay}
          activeOpacity={1}
          onPress={() => setShowSuggestions(false)}
        >
          <Card style={styles.suggestionCard}>
            <FlatList
              data={suggestions}
              renderItem={renderSuggestion}
              keyExtractor={(item, index) => `${item}-${index}`}
              style={styles.suggestionList}
              showsVerticalScrollIndicator={false}
            />
          </Card>
        </TouchableOpacity>
      </Modal>

      {/* Search Type Modal */}
      <Modal
        visible={showTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTypeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypeModal(false)}
        >
          <Card style={styles.typeModal}>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              Tipo de búsqueda
            </Text>
            <FlatList
              data={searchTypes}
              renderItem={renderSearchType}
              keyExtractor={(item) => item.key}
              showsVerticalScrollIndicator={false}
            />
          </Card>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchbar: {
    flex: 1,
    elevation: 2,
    marginRight: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  typeButton: {
    borderRadius: 25,
    elevation: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeChip: {
    marginRight: 8,
  },
  searchButton: {
    borderRadius: 20,
  },
  searchButtonContent: {
    paddingHorizontal: 16,
  },
  suggestionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    paddingTop: 120,
    paddingHorizontal: 16,
  },
  suggestionCard: {
    maxHeight: 200,
    elevation: 8,
  },
  suggestionList: {
    maxHeight: 180,
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeModal: {
    width: width * 0.8,
    maxHeight: 400,
    padding: 16,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
});