import { useQuery, useMutation, useQueryClient } from 'react-query';
import { apiService } from '../services/api';
import { SearchRequest, SearchResponse, SearchType } from '../types';
import { useAppStore } from '../store/appStore';

export const useSearch = () => {
  const queryClient = useQueryClient();
  const { addToHistory, setLoading } = useAppStore();

  const searchMutation = useMutation(
    async ({ request, type }: { request: SearchRequest; type: SearchType }) => {
      setLoading(true);
      const result = await apiService.search(request, type);
      
      // Agregar al historial
      addToHistory({
        id: Date.now().toString(),
        query: request.query,
        type,
        timestamp: new Date(),
        resultsCount: result.results.length,
      });

      return result;
    },
    {
      onSuccess: (data) => {
        console.log('✅ Búsqueda exitosa:', data.query);
        setLoading(false);
      },
      onError: (error) => {
        console.error('❌ Error en búsqueda:', error);
        setLoading(false);
      },
    }
  );

  const performSearch = (request: SearchRequest, type: SearchType = 'general') => {
    return searchMutation.mutateAsync({ request, type });
  };

  return {
    performSearch,
    isLoading: searchMutation.isLoading,
    error: searchMutation.error,
    data: searchMutation.data,
    isSuccess: searchMutation.isSuccess,
    reset: searchMutation.reset,
  };
};

export const useServerHealth = () => {
  return useQuery(
    'serverHealth',
    () => apiService.healthCheck(),
    {
      refetchInterval: 30000, // Check every 30 seconds
      retry: 3,
      staleTime: 10000, // 10 seconds
    }
  );
};

export const useServerInfo = () => {
  return useQuery(
    'serverInfo',
    () => apiService.getServerInfo(),
    {
      staleTime: 300000, // 5 minutes
      retry: 2,
    }
  );
};

// Hook para búsquedas con caché
export const useCachedSearch = (request: SearchRequest, type: SearchType, enabled: boolean = false) => {
  return useQuery(
    ['search', type, request.query, request.maxResults, request.language],
    () => apiService.search(request, type),
    {
      enabled,
      staleTime: 300000, // 5 minutes
      cacheTime: 600000, // 10 minutes
      retry: 2,
      onSuccess: (data) => {
        console.log('✅ Búsqueda en caché exitosa:', data.query);
      },
      onError: (error) => {
        console.error('❌ Error en búsqueda en caché:', error);
      },
    }
  );
};

// Hook para búsquedas múltiples
export const useMultipleSearches = () => {
  const queryClient = useQueryClient();
  const { addToHistory } = useAppStore();

  const performMultipleSearches = async (
    requests: Array<{ request: SearchRequest; type: SearchType }>
  ) => {
    const promises = requests.map(({ request, type }) =>
      apiService.search(request, type).then(result => {
        // Agregar al historial
        addToHistory({
          id: `${Date.now()}-${type}`,
          query: request.query,
          type,
          timestamp: new Date(),
          resultsCount: result.results.length,
        });
        return { type, result };
      })
    );

    try {
      const results = await Promise.allSettled(promises);
      return results.map((result, index) => ({
        type: requests[index].type,
        status: result.status,
        data: result.status === 'fulfilled' ? result.value.result : null,
        error: result.status === 'rejected' ? result.reason : null,
      }));
    } catch (error) {
      console.error('Error en búsquedas múltiples:', error);
      throw error;
    }
  };

  return { performMultipleSearches };
};

// Hook para sugerencias de búsqueda basadas en historial
export const useSearchSuggestions = (query: string) => {
  const { searchHistory } = useAppStore();

  const suggestions = query.length > 1 
    ? searchHistory
        .filter(item => 
          item.query.toLowerCase().includes(query.toLowerCase()) &&
          item.query.toLowerCase() !== query.toLowerCase()
        )
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5)
        .map(item => item.query)
    : [];

  return { suggestions };
};