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

export interface MCPSearchRequest {
  query: string;
  maxResults?: number;
  language?: string;
  region?: string;
  safeSearch?: 'strict' | 'moderate' | 'off';
}

export interface MCPError {
  code: string;
  message: string;
  details?: any;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface ServerConfig {
  port: number;
  allowedOrigins: string[];
  rateLimit: RateLimitConfig;
  searchConfig: {
    apiKey: string;
    engineId: string;
  };
}