import axios, { AxiosInstance, AxiosResponse } from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { SearchRequest, SearchResponse, APIResponse, SearchType } from '../types';

class APIService {
  private client: AxiosInstance;
  private baseURL: string;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Verificar conectividad
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new Error('No hay conexión a internet');
        }

        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        this.retryCount = 0; // Reset retry count on success
        return response;
      },
      async (error) => {
        console.error('❌ Response Error:', error.response?.status, error.message);
        
        // Retry logic for network errors
        if (this.shouldRetry(error) && this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`🔄 Reintentando... (${this.retryCount}/${this.maxRetries})`);
          
          // Exponential backoff
          const delay = Math.pow(2, this.retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return this.client.request(error.config);
        }

        this.retryCount = 0;
        return Promise.reject(error);
      }
    );
  }

  private shouldRetry(error: any): boolean {
    return (
      error.code === 'NETWORK_ERROR' ||
      error.code === 'ECONNABORTED' ||
      (error.response && error.response.status >= 500)
    );
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'OK';
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async getServerInfo(): Promise<any> {
    try {
      const response = await this.client.get('/api/info');
      return response.data;
    } catch (error) {
      console.error('Error getting server info:', error);
      throw this.handleError(error);
    }
  }

  async search(request: SearchRequest, type: SearchType = 'general'): Promise<SearchResponse> {
    try {
      const endpoint = this.getSearchEndpoint(type);
      const response = await this.client.post<APIResponse<SearchResponse>>(endpoint, request);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Error en la búsqueda');
      }

      return response.data.data!;
    } catch (error) {
      console.error(`Error in ${type} search:`, error);
      throw this.handleError(error);
    }
  }

  async searchGeneral(request: SearchRequest): Promise<SearchResponse> {
    return this.search(request, 'general');
  }

  async searchNews(request: SearchRequest): Promise<SearchResponse> {
    return this.search(request, 'news');
  }

  async searchAcademic(request: SearchRequest): Promise<SearchResponse> {
    return this.search(request, 'academic');
  }

  private getSearchEndpoint(type: SearchType): string {
    switch (type) {
      case 'news':
        return '/api/search/news';
      case 'academic':
        return '/api/search/academic';
      default:
        return '/api/search';
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        const message = error.response.data?.error || 
                       error.response.data?.message || 
                       `Error del servidor: ${error.response.status}`;
        return new Error(message);
      } else if (error.request) {
        // Request was made but no response received
        return new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      }
    }
    
    return error instanceof Error ? error : new Error('Error desconocido');
  }

  updateBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
    this.client.defaults.baseURL = newBaseURL;
  }

  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout;
  }

  setMaxRetries(maxRetries: number): void {
    this.maxRetries = maxRetries;
  }
}

// Singleton instance
export const apiService = new APIService();
export default APIService;