export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  displayUrl: string;
  datePublished?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
}

export interface SearchRequest {
  query: string;
  maxResults?: number;
  language?: string;
  region?: string;
  safeSearch?: 'strict' | 'moderate' | 'off';
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
  timestamp: string;
}

export type SearchType = 'general' | 'news' | 'academic';

export interface SearchHistory {
  id: string;
  query: string;
  type: SearchType;
  timestamp: Date;
  resultsCount: number;
}

export interface AppConfig {
  apiBaseUrl: string;
  timeout: number;
  maxRetries: number;
  cacheTimeout: number;
}

export interface AppState {
  isOnline: boolean;
  isLoading: boolean;
  searchHistory: SearchHistory[];
  config: AppConfig;
}